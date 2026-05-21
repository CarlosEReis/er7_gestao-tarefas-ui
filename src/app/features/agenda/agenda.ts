import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Ticket, TicketsService } from '../tickets/tickets-service';

type EventColor = {
  background: string;
  border: string;
  text: string;
};

type TicketEventProps = {
  ticketId: string;
  status: string;
  prioridade: string;
  projeto: string;
};

@Component({
  selector: 'app-agenda',
  imports: [FullCalendarModule],
  templateUrl: './agenda.html',
  styleUrl: './agenda.scss',
})
export class Agenda implements OnInit {
  private readonly router = inject(Router);
  private readonly ticketsService = inject(TicketsService);

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly tickets = signal<Ticket[]>([]);
  protected readonly eventos = signal<EventInput[]>([]);

  protected readonly calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin, multiMonthPlugin, timeGridPlugin],
    initialView: 'timeGridWeek',
    locale: ptBrLocale,
    height: '100%',
    contentHeight: 'auto',
    expandRows: true,
    firstDay: 0,
    fixedWeekCount: false,
    navLinks: true,
    displayEventTime: false,
    eventDisplay: 'block',
    nowIndicator: true,
    allDayText: 'Dia todo',
    dayMaxEvents: 4,
    moreLinkText: 'mais',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridWeek,dayGridMonth,multiMonthQuarter',
    },
    buttonText: {
      today: 'Hoje',
    },
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    slotDuration: '01:00:00',
    slotLabelFormat: {
      hour: 'numeric',
      hour12: true,
    },
    views: {
      timeGridWeek: {
        buttonText: 'Semana',
        dayHeaderContent: (arg: { date: Date; isToday: boolean }) => ({
          html: this.montarCabecalhoDia(arg.date, arg.isToday),
        }),
      },
      dayGridMonth: {
        buttonText: 'Mês',
      },
      multiMonthQuarter: {
        type: 'multiMonth',
        duration: { months: 3 },
        dateAlignment: 'month',
        buttonText: 'Trimestre',
        multiMonthMaxColumns: 3,
      },
    },
    eventClick: (info) => this.abrirTicket(info),
    eventDidMount: ({ el, event }) => {
      const props = event.extendedProps as Partial<TicketEventProps>;
      const details = [event.title, props.status, props.prioridade, props.projeto]
        .filter(Boolean)
        .join(' - ');

      el.setAttribute('title', details);
    },
  };

  ngOnInit(): void {
    this.buscarTickets();
  }

  private buscarTickets(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.ticketsService.buscarTickets().subscribe({
      next: (tickets) => {
        this.tickets.set(tickets);
        this.eventos.set(this.montarEventos(tickets));
        this.carregando.set(false);
      },
      error: () => {
        this.tickets.set([]);
        this.eventos.set([]);
        this.erro.set('Não foi possível carregar os tickets da agenda.');
        this.carregando.set(false);
      },
    });
  }

  private montarEventos(tickets: Ticket[]): EventInput[] {
    return tickets
      .map((ticket) => this.montarEvento(ticket))
      .filter((event): event is EventInput => !!event);
  }

  private montarEvento(ticket: Ticket): EventInput | null {
    const start = this.normalizarData(ticket.dataInicio ?? ticket.dtAbertura);

    if (!start) {
      return null;
    }

    const dataFinal = this.normalizarData(ticket.dataFinal);
    const end = dataFinal && dataFinal >= start ? this.adicionarDias(dataFinal, 1) : undefined;
    const color = this.corPorPrioridade(ticket.prioridade);

    return {
      id: ticket.id,
      title: `${ticket.ticketId} - ${ticket.titulo}`,
      start,
      end,
      allDay: true,
      backgroundColor: color.background,
      borderColor: color.border,
      textColor: color.text,
      extendedProps: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        prioridade: ticket.prioridade,
        projeto: ticket.projeto,
      } satisfies TicketEventProps,
    };
  }

  private abrirTicket(info: EventClickArg): void {
    info.jsEvent.preventDefault();

    if (!info.event.id) {
      return;
    }

    void this.router.navigate(['/tickets', info.event.id, 'detalhe']);
  }

  private corPorPrioridade(prioridade: string): EventColor {
    switch (prioridade) {
      case 'High':
        return { background: '#fee2e2', border: '#ef4444', text: '#7f1d1d' };
      case 'Medium':
        return { background: '#fef3c7', border: '#f59e0b', text: '#78350f' };
      case 'Low':
        return { background: '#dcfce7', border: '#22c55e', text: '#14532d' };
      default:
        return { background: '#e0f2fe', border: '#0ea5e9', text: '#0c4a6e' };
    }
  }

  private montarCabecalhoDia(date: Date, isToday: boolean): string {
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
      .format(date)
      .replace('.', '')
      .toUpperCase();
    const day = new Intl.DateTimeFormat('pt-BR', { day: 'numeric' }).format(date);
    const todayClass = isToday ? ' google-day-header--today' : '';

    return `
      <span class="google-day-header${todayClass}">
        <span class="google-day-header__weekday">${weekday}</span>
        <span class="google-day-header__date">${day}</span>
      </span>
    `;
  }

  private normalizarData(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return this.formatarData(date);
  }

  private adicionarDias(value: string, days: number): string {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + days));

    return this.formatarData(date);
  }

  private formatarData(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}

import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Fluid } from 'primeng/fluid';
import { SelectButton } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { List } from './list/list';
import { Kanban } from './kanban/kanban';
import { Ticket, TicketsService } from './tickets-service';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-tickets',
  imports: [Button, DatePicker, Fluid, FormsModule, SelectButton, List, Kanban, RouterOutlet, RouterLink],
  templateUrl: './tickets.html',
  styleUrl: './tickets.scss',
})
export class Tickets implements OnInit{

  private readonly ticketsService = inject(TicketsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  dataInicial: Date | null = null;
  dataFinal: Date | null = null;
  viewMode = 'lista';
  viewModeOptions = [
    { label: 'Kanban', value: 'kanban' },
    { label: 'Lista', value: 'lista' },
  ];

  tickets = signal<Ticket[]>([]);

  ngOnInit(): any {
    this.buscarTickets();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd && this.router.url.startsWith('/tickets')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.buscarTickets());
  }

  private buscarTickets() {
    this.ticketsService.buscarTickets().subscribe((tickets) => {
      this.tickets.set(tickets);
    });
  }

  atualizarTicketsKanban(tickets: Ticket[]): void {
    this.tickets.set(tickets);
  }

}

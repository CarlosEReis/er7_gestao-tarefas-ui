import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { catchError, forkJoin, map, of } from 'rxjs';
import { Projeto, ProjetoListaKanban, ProjetosService } from '../../projetos/projetos-service';
import { TICKET_KANBAN_COLUMNS, TicketColumnOption } from '../kanban-columns';
import { Ticket, TicketsService } from '../tickets-service';
import { Usuario, UsuariosService } from '../usuarios-service';

type KanbanColumn = TicketColumnOption & {
  id?: string;
  cor?: string;
  descricao?: string;
  tickets: Ticket[];
};

type ChecklistSummary = {
  done: number;
  total: number;
};

@Component({
  selector: 'app-kanban',
  imports: [Avatar, Button, CdkDrag, CdkDropList, CdkDropListGroup, RouterLink, Tag, Tooltip],
  templateUrl: './kanban.html',
  styleUrl: './kanban.scss',
})
export class Kanban implements OnInit {
  private readonly projetosService = inject(ProjetosService);
  private readonly ticketsService = inject(TicketsService);
  private readonly usuariosService = inject(UsuariosService);

  @Output() ticketsChanged = new EventEmitter<Ticket[]>();

  columns: KanbanColumn[] = [];
  checklistSummaries: Record<string, ChecklistSummary> = {};
  usuariosPorId: Record<string, Usuario> = {};
  private readonly collapsedColumnKeys = new Set<string>();
  private currentTickets: Ticket[] = [];
  private projetos: Projeto[] = [];
  private projetosRequestVersion = 0;

  ngOnInit(): void {
    this.usuariosService.buscarUsuarios().subscribe((usuarios) => {
      this.usuariosPorId = usuarios.reduce<Record<string, Usuario>>((acc, usuario) => {
        acc[usuario.id] = usuario;

        if (usuario.legadoId) {
          acc[String(usuario.legadoId)] = usuario;
        }

        return acc;
      }, {});
    });
  }

  @Input() set tickets(tickets: Ticket[]) {
    this.currentTickets = tickets;
    this.recarregarProjetos();
    this.loadChecklistSummaries(tickets);
  }

  drop(event: CdkDragDrop<Ticket[]>, targetColumn: KanbanColumn): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.emitTicketsChanged();
      return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );

    const movedTicket = event.container.data[event.currentIndex];
    const updatedTicket: Ticket = {
      ...movedTicket,
      status: targetColumn.label,
      coluna: targetColumn.value,
    };

    event.container.data[event.currentIndex] = updatedTicket;
    this.emitTicketsChanged();
    this.ticketsService.atualizarTicket(updatedTicket).subscribe();
  }

  trackTicket(_index: number, ticket: Ticket): string {
    return ticket.id;
  }

  isColumnCollapsed(column: KanbanColumn): boolean {
    return this.collapsedColumnKeys.has(this.columnKey(column));
  }

  toggleColumnCollapsed(column: KanbanColumn): void {
    const columnKey = this.columnKey(column);

    if (this.collapsedColumnKeys.has(columnKey)) {
      this.collapsedColumnKeys.delete(columnKey);
      return;
    }

    this.collapsedColumnKeys.add(columnKey);
  }

  getSeverityPriority(priority: string) {
    switch (priority) {
      case 'Low':
        return 'success';
      case 'Medium':
        return 'warn';
      case 'High':
        return 'danger';
      default:
        return 'info';
    }
  }

  getSeverityType(type: string) {
    switch (type) {
      case 'Feature':
        return 'info';
      case 'Bug':
        return 'danger';
      default:
        return 'warn';
    }
  }

  dateLabel(ticket: Ticket): string {
    const start = ticket.dataInicio ?? ticket.dtAbertura;
    const end = ticket.dataFinal;

    if (start && end) {
      return `${this.formatDate(start)} - ${this.formatDate(end)}`;
    }

    return this.formatDate(start);
  }

  membersCount(ticket: Ticket): number {
    return ticket.membros?.length ?? 0;
  }

  memberAvatars(ticket: Ticket): Usuario[] {
    return (ticket.membros ?? [])
      .map((memberId) => this.usuariosPorId[String(memberId)])
      .filter((usuario): usuario is Usuario => !!usuario);
  }

  trackMember(_index: number, member: Usuario): string {
    return member.id;
  }

  checklistSummary(ticket: Ticket): ChecklistSummary {
    return this.checklistSummaries[ticket.id] ?? { done: 0, total: 0 };
  }

  hasDescription(ticket: Ticket): boolean {
    if (!ticket.descricao) {
      return false;
    }

    const descriptionText = ticket.descricao
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    return descriptionText.length > 0 || /<img\b/i.test(ticket.descricao);
  }

  labelColor(label: string, index: number): string {
    const colors = ['#34d399', '#facc15', '#fb923c', '#f87171', '#38bdf8', '#a78bfa'];
    const labelSeed = [...label].reduce((sum, char) => sum + char.charCodeAt(0), index);
    return colors[labelSeed % colors.length];
  }

  private createColumns(tickets: Ticket[]): KanbanColumn[] {
    const columns = this.createEmptyColumns(tickets);

    for (const ticket of tickets) {
      const column = columns.find((item) => item.value === this.resolveColumnValue(ticket, columns)) ?? columns[0];
      column.tickets.push(ticket);
    }

    return columns;
  }

  private createEmptyColumns(tickets: Ticket[] = []): KanbanColumn[] {
    const projeto = this.findProjetoForTickets(tickets);
    const listasKanban = projeto?.listasKanban?.length ? projeto.listasKanban : null;

    if (listasKanban) {
      return this.createProjectColumns(listasKanban);
    }

    return TICKET_KANBAN_COLUMNS.map((column, index) => ({
      ...column,
      id: column.value,
      cor: this.defaultColumnColor(index),
      tickets: [],
    }));
  }

  private emitTicketsChanged(): void {
    this.currentTickets = this.columns.flatMap((column) => column.tickets);
    this.ticketsChanged.emit(this.currentTickets);
  }

  private loadChecklistSummaries(tickets: Ticket[]): void {
    if (!tickets.length) {
      this.checklistSummaries = {};
      return;
    }

    forkJoin(
      tickets.map((ticket) =>
        this.ticketsService.buscarChecklistPorTicketId(ticket.id).pipe(
          map((checklist) => {
            const itens = checklist?.itens ?? [];
            return {
              ticketId: ticket.id,
              summary: {
                done: itens.filter((item) => item.concluido).length,
                total: itens.length,
              },
            };
          }),
          catchError(() => of({
            ticketId: ticket.id,
            summary: { done: 0, total: 0 },
          })),
        )
      )
    ).subscribe((summaries) => {
      this.checklistSummaries = summaries.reduce<Record<string, ChecklistSummary>>((acc, item) => {
        acc[item.ticketId] = item.summary;
        return acc;
      }, {});
    });
  }

  private resolveColumnValue(ticket: Ticket, columns: KanbanColumn[]): string {
    const columnValue = this.normalizeColumnValue(ticket.coluna ?? ticket.status);

    if (columnValue === 'em-andamento') {
      return 'em-progresso';
    }

    if (columnValue === 'validar-homol') {
      return 'validar-homl';
    }

    if (columns.some((column) => column.value === columnValue)) {
      return columnValue;
    }

    const statusValue = this.normalizeColumnValue(ticket.status);
    return columns.some((column) => column.value === statusValue) ? statusValue : columns[0]?.value ?? 'backlog';
  }

  private createProjectColumns(listasKanban: ProjetoListaKanban[]): KanbanColumn[] {
    return [...listasKanban]
      .filter((lista) => lista.nome.trim())
      .sort((primeira, segunda) => primeira.ordem - segunda.ordem)
      .map((lista) => ({
        id: lista.id,
        label: lista.nome,
        value: this.normalizeColumnValue(lista.nome),
        cor: lista.cor,
        descricao: lista.descricao,
        tickets: [],
      }));
  }

  private findProjetoForTickets(tickets: Ticket[]): Projeto | undefined {
    const projetoNome = tickets.find((ticket) => ticket.projeto)?.projeto;

    if (!projetoNome) {
      return undefined;
    }

    return this.projetos.find((projeto) => projeto.nome === projetoNome || projeto.id === projetoNome);
  }

  private defaultColumnColor(index: number): string {
    return ['#fef3c7', '#d1fae5', '#e0f2fe', '#fce7f3', '#ede9fe', '#dcfce7'][index] ?? '#f3f4f6';
  }

  private columnKey(column: KanbanColumn): string {
    return column.id ?? column.value ?? column.label;
  }

  private recarregarProjetos(): void {
    const requestVersion = ++this.projetosRequestVersion;

    this.projetosService.buscarProjetos().subscribe({
      next: (projetos) => {
        if (requestVersion !== this.projetosRequestVersion) {
          return;
        }

        this.projetos = projetos;
        this.columns = this.createColumns(this.currentTickets);
      },
      error: () => {
        if (requestVersion !== this.projetosRequestVersion) {
          return;
        }

        this.columns = this.createColumns(this.currentTickets);
      },
    });
  }

  private normalizeColumnValue(value: string | undefined): string {
    if (!value) {
      return 'backlog';
    }

    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'Sem data';
    }

    const [year, month, day] = value.slice(0, 10).split('-');
    if (!year || !month || !day) {
      return value;
    }

    return `${day}/${month}`;
  }
}

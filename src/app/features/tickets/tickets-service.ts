import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type Ticket = {
  id: string;
  ticketId: string;
  dtAbertura: string;
  desenvolvedor: {
    nome: string;
    foto: string;
  };
  titulo: string;
  projeto: string;
  tipo: string;
  prioridade: string;
  status: string;
  branch: string;
  descricao?: string;
  etiquetas?: string[];
  dataInicio?: string | null;
  dataFinal?: string | null;
  membros?: number[];
  coluna?: string;
};

export type TicketChecklist = {
  id: string;
  ticketId: string;
  titulo: string;
  itens: TicketChecklistItem[];
};

export type TicketChecklistItem = {
  id: string;
  texto: string;
  concluido: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class TicketsService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/tickets';
  private readonly checklistsUrl = 'http://localhost:3000/checklists';

  public buscarTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(this.apiUrl);
  }

  public buscarTicketPorId(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/${id}`);
  }

  public criarTicket(ticket: Ticket): Observable<Ticket> {
    return this.http.post<Ticket>(this.apiUrl, ticket);
  }

  public atualizarTicket(ticket: Ticket): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.apiUrl}/${ticket.id}`, ticket);
  }

  public buscarChecklistPorTicketId(ticketId: string): Observable<TicketChecklist | null> {
    return this.http.get<TicketChecklist[]>(`${this.checklistsUrl}?ticketId=${ticketId}`).pipe(
      map((checklists) => checklists[0] ?? null)
    );
  }

  public criarChecklist(checklist: TicketChecklist): Observable<TicketChecklist> {
    return this.http.post<TicketChecklist>(this.checklistsUrl, checklist);
  }

  public atualizarChecklist(checklist: TicketChecklist): Observable<TicketChecklist> {
    return this.http.put<TicketChecklist>(`${this.checklistsUrl}/${checklist.id}`, checklist);
  }

  public excluirChecklist(checklistId: string): Observable<void> {
    return this.http.delete<void>(`${this.checklistsUrl}/${checklistId}`);
  }
}

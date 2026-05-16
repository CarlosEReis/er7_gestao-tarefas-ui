import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root',
})
export class TicketsService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/tickets';

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
}

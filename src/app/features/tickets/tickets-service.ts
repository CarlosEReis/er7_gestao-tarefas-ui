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

export type TicketArquivo = {
  id: string;
  ticketId: string;
  nome: string;
  tipo: string;
  tamanho: number;
  conteudo: string;
  criadoEm: string;
};

export type NovoTicketArquivo = Omit<TicketArquivo, 'id'>;

@Injectable({
  providedIn: 'root',
})
export class TicketsService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/tickets';
  private readonly checklistsUrl = 'http://localhost:3000/checklists';
  private readonly arquivosUrl = 'http://localhost:3000/tickets/arquivos';

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

  public buscarArquivosPorTicketId(ticketId: string): Observable<TicketArquivo[]> {
    return this.http.get<TicketArquivo[]>(`${this.arquivosUrl}?ticketId=${encodeURIComponent(ticketId)}`);
  }

  public criarArquivo(arquivo: NovoTicketArquivo): Observable<TicketArquivo> {
    return this.http.post<TicketArquivo>(this.arquivosUrl, arquivo);
  }

  public excluirArquivo(arquivoId: string): Observable<void> {
    return this.http.delete<void>(`${this.arquivosUrl}/${arquivoId}`);
  }
}

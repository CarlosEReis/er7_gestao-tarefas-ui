import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class TicketsService {

  private http = inject(HttpClient)

  public buscarTickets() {
    return this.http.get('http://localhost:3000/tickets');
  }
}

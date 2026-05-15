import { Component, inject, OnInit, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Fluid } from 'primeng/fluid';
import { FormsModule } from '@angular/forms';
import { List } from './list/list';
import { TicketsService } from './tickets-service';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-tickets',
  imports: [Button, DatePicker, Fluid, FormsModule, List, RouterOutlet, RouterLink],
  templateUrl: './tickets.html',
  styleUrl: './tickets.scss',
})
export class Tickets implements OnInit{

  ticketsService = inject(TicketsService);
  router = inject(Router);

  dataInicial: Date | null = null;
  dataFinal: Date | null = null;

  tickets = signal<any[]>([]);

  ngOnInit(): any {
    this.buscarTickets();
  }

  private buscarTickets() {
    this.ticketsService.buscarTickets().subscribe((tickets: any) => {
      this.tickets.set(tickets);
    });
  }


}

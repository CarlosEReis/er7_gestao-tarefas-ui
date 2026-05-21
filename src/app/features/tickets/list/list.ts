import { Component, OnInit, inject, input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { Avatar } from 'primeng/avatar';
import { Tooltip } from 'primeng/tooltip';
import { Tag } from 'primeng/tag';
import { Button } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { Projeto, ProjetosService } from '../../projetos/projetos-service';
import { Ticket } from '../tickets-service';

@Component({
  selector: 'app-list',
  imports: [TableModule, Avatar, Button, Tooltip, Tag, RouterLink],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List implements OnInit {

  private readonly projetosService = inject(ProjetosService);

  tickets = input<Ticket[]>([]);
  private statusColorsByProject: Record<string, Record<string, string>> = {};

  ngOnInit(): void {
    this.projetosService.buscarProjetos().subscribe((projetos) => {
      this.statusColorsByProject = projetos.reduce<Record<string, Record<string, string>>>((acc, projeto) => {
        const colors = this.statusColorsFromProject(projeto);

        acc[projeto.nome] = colors;
        acc[projeto.id] = colors;

        return acc;
      }, {});
    });
  }

  getSeverityPriority(status: string) {
    switch (status) {
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

  getSeverityType(status: string) {
    switch (status) {
      case 'Feature':
        return 'info';
      case 'Bug':
        return 'danger';
      default:
        return 'warn';
    }
  }

  statusColor(ticket: Ticket): string | null {
    const projectColors = this.statusColorsByProject[ticket.projeto];

    if (!projectColors) {
      return null;
    }

    return projectColors[this.normalizeStatus(ticket.status)] ?? projectColors[this.normalizeStatus(ticket.coluna)] ?? null;
  }

  private statusColorsFromProject(projeto: Projeto): Record<string, string> {
    return (projeto.listasKanban ?? []).reduce<Record<string, string>>((acc, lista) => {
      acc[this.normalizeStatus(lista.nome)] = lista.cor;
      acc[this.normalizeStatus(lista.id)] = lista.cor;
      return acc;
    }, {});
  }

  private normalizeStatus(value: string | undefined): string {
    if (!value) {
      return '';
    }

    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}

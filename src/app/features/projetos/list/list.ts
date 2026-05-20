import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Projeto, ProjetoStatus } from '../projetos-service';

@Component({
  selector: 'app-projetos-list',
  imports: [Button, RouterLink, TableModule, Tag],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List {

  projetos = input<Projeto[]>([]);

  getSeverity(status: ProjetoStatus) {
    switch (status) {
      case 'Ativo':
        return 'success';
      case 'Pausado':
        return 'warn';
      case 'Concluído':
        return 'info';
      default:
        return 'secondary';
    }
  }
}

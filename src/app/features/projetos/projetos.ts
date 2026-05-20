import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Fluid } from 'primeng/fluid';
import { List } from './list/list';
import { Projeto, ProjetosService } from './projetos-service';

@Component({
  selector: 'app-projetos',
  imports: [Button, DatePicker, Fluid, FormsModule, List, RouterLink, RouterOutlet],
  templateUrl: './projetos.html',
  styleUrl: './projetos.scss',
})
export class Projetos implements OnInit {

  private readonly projetosService = inject(ProjetosService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  dataInicial: Date | null = null;
  dataFinal: Date | null = null;
  projetos = signal<Projeto[]>([]);

  ngOnInit(): void {
    this.buscarProjetos();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd && this.router.url.startsWith('/projetos')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.buscarProjetos());
  }

  private buscarProjetos(): void {
    this.projetosService.buscarProjetos().subscribe((projetos) => {
      this.projetos.set(projetos);
    });
  }
}

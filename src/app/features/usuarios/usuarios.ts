import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { Fluid } from 'primeng/fluid';
import { InputText } from 'primeng/inputtext';
import { filter } from 'rxjs';
import { List } from './list/list';
import { Usuario, UsuariosService } from './usuarios-service';

@Component({
  selector: 'app-usuarios',
  imports: [Button, Fluid, FormsModule, InputText, List, RouterLink, RouterOutlet],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
})
export class Usuarios implements OnInit {

  private readonly usuariosService = inject(UsuariosService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  busca = '';
  usuarios = signal<Usuario[]>([]);

  ngOnInit(): void {
    this.buscarUsuarios();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd && this.router.url.startsWith('/usuarios')),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.buscarUsuarios());
  }

  get usuariosFiltrados(): Usuario[] {
    const termo = this.busca.trim().toLowerCase();

    if (!termo) {
      return this.usuarios();
    }

    return this.usuarios().filter((usuario) => (
      usuario.nome.toLowerCase().includes(termo)
    ));
  }

  private buscarUsuarios(): void {
    this.usuariosService.buscarUsuarios().subscribe((usuarios) => {
      this.usuarios.set(usuarios);
    });
  }
}

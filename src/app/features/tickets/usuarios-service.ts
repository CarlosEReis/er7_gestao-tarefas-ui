import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

export type Usuario = {
  id: string;
  legadoId?: number;
  nome: string;
  foto: string;
};

type UsuarioApi = {
  id: string;
  nome: string;
  foto: string;
};

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/usuarios';
  private readonly idsLegadosPorNome = new Map<string, number>([
    ['Lucas Rocha', 1],
    ['Jéssica Braga', 2],
    ['Renato Morais', 3],
  ]);

  buscarUsuarios(): Observable<Usuario[]> {
    return this.http.get<UsuarioApi[]>(this.apiUrl).pipe(
      map((usuarios) => usuarios.map((usuario) => ({
        ...usuario,
        legadoId: this.idsLegadosPorNome.get(usuario.nome),
      }))),
    );
  }
}

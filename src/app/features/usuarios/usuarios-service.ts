import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type Usuario = {
  id: string;
  nome: string;
  foto: string;
};

export type NovoUsuario = Omit<Usuario, 'id'>;

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/usuarios';

  buscarUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  buscarUsuarioPorId(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
  }

  criarUsuario(usuario: NovoUsuario): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, usuario);
  }

  atualizarUsuario(usuario: Usuario): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${usuario.id}`, usuario);
  }
}

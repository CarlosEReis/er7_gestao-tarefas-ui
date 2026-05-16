import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type Etiqueta = {
  id: number | string;
  nome: string;
  cor: string;
};

export type NovaEtiqueta = Omit<Etiqueta, 'id'>;

@Injectable({
  providedIn: 'root',
})
export class EtiquetasService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/etiquetas';

  buscarEtiquetas(): Observable<Etiqueta[]> {
    return this.http.get<Etiqueta[]>(this.apiUrl);
  }

  criarEtiqueta(etiqueta: NovaEtiqueta): Observable<Etiqueta> {
    return this.http.post<Etiqueta>(this.apiUrl, etiqueta);
  }
}

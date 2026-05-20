import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type ProjetoStatus = 'Ativo' | 'Pausado' | 'Concluído';

export type Projeto = {
  id: string;
  nome: string;
  chave: string;
  cliente: string;
  responsavel: string;
  status: ProjetoStatus;
  dataInicio: string;
  dataFinal?: string | null;
  descricao?: string;
};

export type NovoProjeto = Omit<Projeto, 'id'>;

@Injectable({
  providedIn: 'root',
})
export class ProjetosService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/projetos';

  buscarProjetos(): Observable<Projeto[]> {
    return this.http.get<Projeto[]>(this.apiUrl);
  }

  criarProjeto(projeto: NovoProjeto): Observable<Projeto> {
    return this.http.post<Projeto>(this.apiUrl, projeto);
  }
}

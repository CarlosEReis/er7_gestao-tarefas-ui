import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Chip } from 'primeng/chip';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

type Option = {
  label: string;
  value: string;
};

type Member = {
  id: number;
  nome: string;
};

@Component({
  selector: 'app-form',
  imports: [
    Button,
    Chip,
    DatePicker,
    Dialog,
    FormsModule,
    InputText,
    MultiSelect,
    Select,
    Textarea
  ],
  templateUrl: './form.html',
  styleUrl: './form.scss',
})
export class Form {

  private readonly router = inject(Router);

  visible = true;

  colunas: Option[] = [
    { label: 'Backlog', value: 'backlog' },
    { label: 'Em Progresso', value: 'em-progresso' },
    { label: 'Em Teste', value: 'em-teste' },
    { label: 'Concluído', value: 'concluido' },
  ];
  colunaSelecionada = 'backlog';

  titulo = '20260416.T10 - Controle de Jornada do Motorista';

  novaEtiqueta = '';
  etiquetas: string[] = ['Nova Feature'];

  dataInicio: Date | null = null;
  dataFinal: Date | null = null;

  membrosDisponiveis: Member[] = [
    { id: 1, nome: 'Lucas Rocha' },
    { id: 2, nome: 'Jéssica Braga' },
    { id: 3, nome: 'Renato Morais' },
  ];
  membrosSelecionados: number[] = [];

  descricao = `📌 1. Início da jornada

O início da jornada deve seguir a seguinte regra:

Para viagens do tipo Meli:
👉 Considerar a data/hora de Origem ATA

Para demais viagens (não Meli):
👉 Considerar a data/hora de lançamento da chegada na origem

📌 2. Fim da jornada (ordem de prioridade)

Para determinar o término da jornada, deve-se considerar:

Destino ATD (quando existir)
Caso não exista, utilizar a Data de Finalização da Viagem
Caso ainda não exista, considerar a data/hora atual (tempo real)

📌 3. Cálculo da jornada

A jornada é o intervalo entre:

Início da jornada (conforme tipo da viagem)
Data fim da jornada (conforme regra acima)`;

  adicionarEtiqueta(): void {
    const valor = this.novaEtiqueta.trim();

    if (!valor) {
      return;
    }

    const etiquetaJaExiste = this.etiquetas.some((etiqueta) => etiqueta.toLowerCase() === valor.toLowerCase());
    if (etiquetaJaExiste) {
      this.novaEtiqueta = '';
      return;
    }

    this.etiquetas = [...this.etiquetas, valor];
    this.novaEtiqueta = '';
  }

  removerEtiqueta(etiquetaRemover: string): void {
    this.etiquetas = this.etiquetas.filter((etiqueta) => etiqueta !== etiquetaRemover);
  }

  fechar(): void {
    this.visible = false;
  }

  onDialogHide(): void {
    void this.router.navigate(['/tickets']);
  }

  salvar(): void {
    this.fechar();
  }
}

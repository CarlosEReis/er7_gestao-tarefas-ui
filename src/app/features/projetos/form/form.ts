import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { ProjetosService, ProjetoStatus } from '../projetos-service';

type StatusOption = {
  label: string;
  value: ProjetoStatus;
};

@Component({
  selector: 'app-projeto-form',
  imports: [Button, DatePicker, Dialog, InputText, ReactiveFormsModule, Select, Textarea],
  templateUrl: './form.html',
  styleUrl: './form.scss',
})
export class Form {

  private readonly router = inject(Router);
  private readonly projetosService = inject(ProjetosService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  visible = true;
  salvando = false;
  statusOptions: StatusOption[] = [
    { label: 'Ativo', value: 'Ativo' },
    { label: 'Pausado', value: 'Pausado' },
    { label: 'Concluído', value: 'Concluído' },
  ];

  projetoForm = this.formBuilder.group({
    nome: this.formBuilder.control('', { validators: [Validators.required] }),
    chave: this.formBuilder.control('', { validators: [Validators.required] }),
    cliente: this.formBuilder.control('', { validators: [Validators.required] }),
    responsavel: this.formBuilder.control('', { validators: [Validators.required] }),
    status: this.formBuilder.control<ProjetoStatus>('Ativo', { validators: [Validators.required] }),
    dataInicio: this.formBuilder.control<Date | null>(new Date(), { validators: [Validators.required] }),
    dataFinal: this.formBuilder.control<Date | null>(null),
    descricao: this.formBuilder.control(''),
  });

  fechar(): void {
    this.visible = false;
    void this.router.navigate(['/projetos']);
  }

  onDialogHide(): void {
    void this.router.navigate(['/projetos']);
  }

  salvar(): void {
    if (this.projetoForm.invalid) {
      this.projetoForm.markAllAsTouched();
      return;
    }

    this.salvando = true;
    this.projetosService.criarProjeto({
      nome: this.projetoForm.controls.nome.value.trim(),
      chave: this.projetoForm.controls.chave.value.trim().toUpperCase(),
      cliente: this.projetoForm.controls.cliente.value.trim(),
      responsavel: this.projetoForm.controls.responsavel.value.trim(),
      status: this.projetoForm.controls.status.value,
      dataInicio: this.dataParaString(this.projetoForm.controls.dataInicio.value),
      dataFinal: this.dataParaString(this.projetoForm.controls.dataFinal.value),
      descricao: this.projetoForm.controls.descricao.value.trim(),
    }).subscribe({
      next: () => this.fechar(),
      error: () => {
        this.salvando = false;
      },
    });
  }

  private dataParaString(data: Date | null): string {
    if (!data) {
      return '';
    }

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  }
}

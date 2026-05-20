import { Component, inject, OnInit } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { Projeto, ProjetosService, ProjetoStatus } from '../projetos-service';

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
export class Form implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projetosService = inject(ProjetosService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  visible = true;
  salvando = false;
  isEdicao = false;
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

  private projetoOriginal: Projeto | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.isEdicao = true;
    this.carregarProjeto(id);
  }

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
    const payload = {
      nome: this.projetoForm.controls.nome.value.trim(),
      chave: this.projetoForm.controls.chave.value.trim().toUpperCase(),
      cliente: this.projetoForm.controls.cliente.value.trim(),
      responsavel: this.projetoForm.controls.responsavel.value.trim(),
      status: this.projetoForm.controls.status.value,
      dataInicio: this.dataParaString(this.projetoForm.controls.dataInicio.value) ?? '',
      dataFinal: this.dataParaString(this.projetoForm.controls.dataFinal.value),
      descricao: this.projetoForm.controls.descricao.value.trim(),
    };

    const request = this.isEdicao && this.projetoOriginal
      ? this.projetosService.atualizarProjeto({ ...payload, id: this.projetoOriginal.id })
      : this.projetosService.criarProjeto(payload);

    request.subscribe({
      next: () => this.fechar(),
      error: () => {
        this.salvando = false;
      },
    });
  }

  private carregarProjeto(id: string): void {
    this.projetosService.buscarProjetoPorId(id).subscribe({
      next: (projeto) => {
        this.projetoOriginal = projeto;
        this.projetoForm.patchValue({
          nome: projeto.nome,
          chave: projeto.chave,
          cliente: projeto.cliente,
          responsavel: projeto.responsavel,
          status: projeto.status,
          dataInicio: this.stringParaData(projeto.dataInicio),
          dataFinal: this.stringParaData(projeto.dataFinal ?? null),
          descricao: projeto.descricao ?? '',
        });
      },
      error: () => this.fechar(),
    });
  }

  private dataParaString(data: Date | null): string | null {
    if (!data) {
      return null;
    }

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  }

  private stringParaData(data: string | null): Date | null {
    if (!data) {
      return null;
    }

    const [ano, mes, dia] = data.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }
}

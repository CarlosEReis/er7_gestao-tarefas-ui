import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { Usuario, UsuariosService } from '../../usuarios/usuarios-service';
import { Projeto, ProjetoListaKanban, ProjetosService, ProjetoStatus } from '../projetos-service';

type StatusOption = {
  label: string;
  value: ProjetoStatus;
};

type ListaKanbanForm = FormGroup<{
  id: FormControl<string>;
  nome: FormControl<string>;
  cor: FormControl<string>;
  descricao: FormControl<string>;
}>;

@Component({
  selector: 'app-projeto-form',
  imports: [AvatarModule, Button, CdkDrag, CdkDropList, DatePicker, Dialog, InputText, MultiSelect, ReactiveFormsModule, Select, Textarea],
  templateUrl: './form.html',
  styleUrl: './form.scss',
})
export class Form implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projetosService = inject(ProjetosService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  visible = true;
  salvando = false;
  usuariosCarregando = false;
  isEdicao = false;
  listaKanbanModalVisivel = false;
  listaKanbanEdicaoIndex: number | null = null;
  usuariosDisponiveis: Usuario[] = [];
  statusOptions: StatusOption[] = [
    { label: 'Ativo', value: 'Ativo' },
    { label: 'Pausado', value: 'Pausado' },
    { label: 'Concluído', value: 'Concluído' },
  ];
  coresListasKanban = [
    '#64748b',
    '#38bdf8',
    '#f59e0b',
    '#22c55e',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
  ];

  projetoForm = this.formBuilder.group({
    nome: this.formBuilder.control('', { validators: [Validators.required] }),
    chave: this.formBuilder.control('', { validators: [Validators.required] }),
    cliente: this.formBuilder.control('', { validators: [Validators.required] }),
    responsavel: this.formBuilder.control('', { validators: [Validators.required] }),
    usuarios: this.formBuilder.control<string[]>([], { validators: [Validators.required] }),
    status: this.formBuilder.control<ProjetoStatus>('Ativo', { validators: [Validators.required] }),
    dataInicio: this.formBuilder.control<Date | null>(new Date(), { validators: [Validators.required] }),
    dataFinal: this.formBuilder.control<Date | null>(null),
    descricao: this.formBuilder.control(''),
    listasKanban: this.formBuilder.array<ListaKanbanForm>(
      this.listasKanbanPadrao().map((lista) => this.criarListaKanbanForm(lista)),
      { validators: [Validators.minLength(1)] },
    ),
  });
  listaKanbanForm = this.formBuilder.group({
    nome: this.formBuilder.control('', { validators: [Validators.required] }),
    cor: this.formBuilder.control(this.coresListasKanban[0], { validators: [Validators.required] }),
    descricao: this.formBuilder.control(''),
  });

  private projetoOriginal: Projeto | null = null;

  ngOnInit(): void {
    this.carregarUsuarios();

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
      usuarios: this.projetoForm.controls.usuarios.value,
      status: this.projetoForm.controls.status.value,
      dataInicio: this.dataParaString(this.projetoForm.controls.dataInicio.value) ?? '',
      dataFinal: this.dataParaString(this.projetoForm.controls.dataFinal.value),
      descricao: this.projetoForm.controls.descricao.value.trim(),
      listasKanban: this.montarListasKanbanPayload(),
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
          usuarios: projeto.usuarios ?? [],
          status: projeto.status,
          dataInicio: this.stringParaData(projeto.dataInicio),
          dataFinal: this.stringParaData(projeto.dataFinal ?? null),
          descricao: projeto.descricao ?? '',
        });
        this.carregarListasKanban(projeto.listasKanban);
      },
      error: () => this.fechar(),
    });
  }

  get listasKanban() {
    return this.projetoForm.controls.listasKanban;
  }

  abrirCriacaoListaKanban(): void {
    this.listaKanbanEdicaoIndex = null;
    this.listaKanbanForm.reset({
      nome: '',
      cor: this.coresListasKanban[this.listasKanban.length % this.coresListasKanban.length],
      descricao: '',
    });
    this.listaKanbanModalVisivel = true;
  }

  abrirEdicaoListaKanban(index: number): void {
    const lista = this.listasKanban.at(index);

    this.listaKanbanEdicaoIndex = index;
    this.listaKanbanForm.setValue({
      nome: lista.controls.nome.value,
      cor: lista.controls.cor.value,
      descricao: lista.controls.descricao.value,
    });
    this.listaKanbanModalVisivel = true;
  }

  fecharListaKanbanModal(): void {
    this.listaKanbanModalVisivel = false;
  }

  salvarListaKanbanModal(): void {
    if (this.listaKanbanForm.invalid) {
      this.listaKanbanForm.markAllAsTouched();
      return;
    }

    const lista = {
      nome: this.listaKanbanForm.controls.nome.value.trim(),
      cor: this.listaKanbanForm.controls.cor.value,
      descricao: this.listaKanbanForm.controls.descricao.value.trim(),
    };

    if (this.listaKanbanEdicaoIndex !== null) {
      this.listasKanban.at(this.listaKanbanEdicaoIndex).patchValue(lista);
      this.fecharListaKanbanModal();
      return;
    }

    this.listasKanban.push(this.criarListaKanbanForm({
      id: this.gerarIdLocal('lista'),
      ...lista,
      ordem: this.listasKanban.length + 1,
    }));
    this.fecharListaKanbanModal();
  }

  removerListaKanban(index: number): void {
    if (this.listasKanban.length <= 1) {
      return;
    }

    this.listasKanban.removeAt(index);
  }

  ordenarListasKanban(event: CdkDragDrop<ListaKanbanForm[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const lista = this.listasKanban.at(event.previousIndex);
    this.listasKanban.removeAt(event.previousIndex);
    this.listasKanban.insert(event.currentIndex, lista);
  }

  get usuariosSelecionados(): Usuario[] {
    const idsSelecionados = this.projetoForm.controls.usuarios.value;

    return idsSelecionados
      .map((id) => this.usuariosDisponiveis.find((usuario) => usuario.id === id))
      .filter((usuario): usuario is Usuario => !!usuario);
  }

  private carregarUsuarios(): void {
    this.usuariosCarregando = true;

    this.usuariosService.buscarUsuarios().subscribe({
      next: (usuarios) => {
        this.usuariosDisponiveis = usuarios;
        this.usuariosCarregando = false;
      },
      error: () => {
        this.usuariosCarregando = false;
      },
    });
  }

  private criarListaKanbanForm(lista: ProjetoListaKanban): ListaKanbanForm {
    return this.formBuilder.group({
      id: this.formBuilder.control(lista.id),
      nome: this.formBuilder.control(lista.nome, { validators: [Validators.required] }),
      cor: this.formBuilder.control(lista.cor, { validators: [Validators.required] }),
      descricao: this.formBuilder.control(lista.descricao),
    });
  }

  private carregarListasKanban(listas: ProjetoListaKanban[] | undefined): void {
    this.listasKanban.clear();

    const listasOrdenadas = [...(listas?.length ? listas : this.listasKanbanPadrao())]
      .sort((primeira, segunda) => primeira.ordem - segunda.ordem);

    for (const lista of listasOrdenadas) {
      this.listasKanban.push(this.criarListaKanbanForm(lista));
    }
  }

  private montarListasKanbanPayload(): ProjetoListaKanban[] {
    return this.listasKanban.controls.map((control, index) => ({
      id: control.controls.id.value || this.gerarIdLocal('lista'),
      nome: control.controls.nome.value.trim(),
      cor: control.controls.cor.value,
      descricao: control.controls.descricao.value.trim(),
      ordem: index + 1,
    }));
  }

  private listasKanbanPadrao(): ProjetoListaKanban[] {
    return [
      {
        id: this.gerarIdLocal('lista'),
        nome: 'Backlog',
        cor: '#64748b',
        descricao: 'Itens priorizados para iniciar.',
        ordem: 1,
      },
      {
        id: this.gerarIdLocal('lista'),
        nome: 'Em Progresso',
        cor: '#38bdf8',
        descricao: 'Itens em desenvolvimento.',
        ordem: 2,
      },
      {
        id: this.gerarIdLocal('lista'),
        nome: 'Concluído',
        cor: '#22c55e',
        descricao: 'Itens finalizados.',
        ordem: 3,
      },
    ];
  }

  private gerarIdLocal(prefixo: string): string {
    const randomId = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
    return `${prefixo}-${randomId}`;
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

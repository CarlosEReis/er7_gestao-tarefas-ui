import { Component, inject, OnInit } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, ValidationErrors, Validators, NonNullableFormBuilder } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Chip } from 'primeng/chip';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { InputText } from 'primeng/inputtext';
import { Popover, PopoverModule } from 'primeng/popover';
import { Select } from 'primeng/select';
import { EditorTextChangeEvent } from 'primeng/types/editor';
import { Etiqueta, EtiquetasService } from '../etiquetas-service';
import { TicketsService, Ticket } from '../tickets-service';
import { Usuario, UsuariosService } from '../usuarios-service';

type Option = {
  label: string;
  value: string;
};

type Member = {
  id: number;
  nome: string;
  foto: string;
};

@Component({
  selector: 'app-form',
  imports: [
    AvatarModule,
    Button,
    Chip,
    DatePicker,
    Dialog,
    EditorModule,
    ReactiveFormsModule,
    InputText,
    PopoverModule,
    Select
  ],
  templateUrl: './form.html',
  styleUrl: './form.scss',
})
export class Form implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly ticketsService = inject(TicketsService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly etiquetasService = inject(EtiquetasService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  visible = true;
  salvando = false;
  isEdicao = false;
  descricaoEmEdicao = true;
  termoBuscaMembros = '';
  termoBuscaEtiquetas = '';
  criandoEtiqueta = false;
  private descricaoAntesEdicao = '';
  private descricaoHtmlAtual = '';

  colunas: Option[] = [
    { label: 'Backlog', value: 'backlog' },
    { label: 'Em Progresso', value: 'em-progresso' },
    { label: 'Em Teste', value: 'em-teste' },
    { label: 'Concluído', value: 'concluido' },
  ];
  membrosDisponiveis: Member[] = [];
  etiquetasDisponiveis: Etiqueta[] = [];
  coresEtiquetas = [
    '#f87171',
    '#fb923c',
    '#facc15',
    '#4ade80',
    '#2dd4bf',
    '#38bdf8',
    '#60a5fa',
    '#a78bfa',
    '#c084fc',
    '#f472b6',
  ];
  corNovaEtiqueta = this.coresEtiquetas[0];

  ticketForm = this.formBuilder.group({
    colunaSelecionada: this.formBuilder.control('backlog'),
    titulo: this.formBuilder.control('', {
      validators: [Validators.required, this.textoObrigatorioSemEspacos],
    }),
    novaEtiqueta: this.formBuilder.control(''),
    etiquetas: this.formBuilder.control<string[]>([]),
    descricao: this.formBuilder.control(''),
    dataInicio: this.formBuilder.control<Date | null>(null),
    dataFinal: this.formBuilder.control<Date | null>(null),
    membrosSelecionados: this.formBuilder.control<number[]>([]),
  });

  private ticketOriginal: Ticket | null = null;

  ngOnInit(): void {
    this.carregarUsuarios();
    this.carregarEtiquetas();

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.isEdicao = true;
    this.descricaoEmEdicao = false;
    this.carregarTicket(id);
  }

  adicionarEtiqueta(): void {
    const valor = this.ticketForm.controls.novaEtiqueta.value.trim() || this.termoBuscaEtiquetas.trim();

    if (!valor) {
      return;
    }

    const etiquetaExistente = this.etiquetasDisponiveis.find((etiqueta) => this.etiquetasIguais(etiqueta.nome, valor));
    if (etiquetaExistente) {
      this.selecionarEtiqueta(etiquetaExistente);
      return;
    }

    this.criarEtiqueta(valor);
  }

  selecionarEtiqueta(etiqueta: Etiqueta, popover?: Popover): void {
    const etiquetasAtuais = this.ticketForm.controls.etiquetas.value;
    const etiquetaJaExiste = etiquetasAtuais.some((etiquetaAtual) => this.etiquetasIguais(etiquetaAtual, etiqueta.nome));
    if (etiquetaJaExiste) {
      this.limparNovaEtiqueta();
      popover?.hide();
      return;
    }

    this.ticketForm.controls.etiquetas.setValue([...etiquetasAtuais, etiqueta.nome]);
    this.limparNovaEtiqueta();
    popover?.hide();
  }

  removerEtiqueta(etiquetaRemover: string): void {
    const etiquetasAtualizadas = this.ticketForm.controls.etiquetas.value
      .filter((etiqueta) => etiqueta !== etiquetaRemover);

    this.ticketForm.controls.etiquetas.setValue(etiquetasAtualizadas);
  }

  atualizarBuscaEtiquetas(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.termoBuscaEtiquetas = valor;
    this.ticketForm.controls.novaEtiqueta.setValue(valor);
  }

  selecionarCorNovaEtiqueta(cor: string): void {
    this.corNovaEtiqueta = cor;
  }

  atualizarBuscaMembros(event: Event): void {
    this.termoBuscaMembros = (event.target as HTMLInputElement).value;
  }

  adicionarMembro(usuario: Usuario, popover: Popover): void {
    const membrosSelecionados = this.ticketForm.controls.membrosSelecionados.value;
    if (membrosSelecionados.includes(usuario.id)) {
      popover.hide();
      return;
    }

    this.ticketForm.controls.membrosSelecionados.setValue([...membrosSelecionados, usuario.id]);
    this.termoBuscaMembros = '';
    popover.hide();
  }

  editarDescricao(): void {
    this.descricaoAntesEdicao = this.ticketForm.controls.descricao.value;
    this.descricaoHtmlAtual = this.descricaoAntesEdicao;
    this.descricaoEmEdicao = true;
  }

  onDescricaoTextChange(event: EditorTextChangeEvent): void {
    this.descricaoHtmlAtual = event.htmlValue ?? '';
  }

  salvarDescricao(): void {
    this.aplicarDescricaoEditada();
    this.descricaoEmEdicao = false;
  }

  cancelarEdicaoDescricao(): void {
    this.ticketForm.controls.descricao.setValue(this.descricaoAntesEdicao);
    this.descricaoEmEdicao = false;
  }

  get descricaoFormatada(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.ticketForm.controls.descricao.value || '');
  }

  get ticketIdCabecalho(): string {
    return this.ticketOriginal?.ticketId ?? '';
  }

  get membrosSelecionados(): Member[] {
    const idsSelecionados = this.ticketForm.controls.membrosSelecionados.value;
    return idsSelecionados
      .map((id) => this.membrosDisponiveis.find((membro) => membro.id === id))
      .filter((membro): membro is Member => !!membro);
  }

  get membrosParaAdicionar(): Member[] {
    const idsSelecionados = this.ticketForm.controls.membrosSelecionados.value;
    const busca = this.termoBuscaMembros.trim().toLowerCase();

    return this.membrosDisponiveis.filter((membro) => {
      const aindaNaoSelecionado = !idsSelecionados.includes(membro.id);
      const correspondeBusca = !busca || membro.nome.toLowerCase().includes(busca);
      return aindaNaoSelecionado && correspondeBusca;
    });
  }

  get temMembrosSelecionados(): boolean {
    return this.membrosSelecionados.length > 0;
  }

  get etiquetasSelecionadas(): Etiqueta[] {
    return this.ticketForm.controls.etiquetas.value.map((nome) => (
      this.etiquetasDisponiveis.find((etiqueta) => this.etiquetasIguais(etiqueta.nome, nome)) ?? {
        id: nome,
        nome,
        cor: '#f59e0b',
      }
    ));
  }

  get etiquetasParaAdicionar(): Etiqueta[] {
    const etiquetasSelecionadas = this.ticketForm.controls.etiquetas.value;
    const busca = this.termoBuscaEtiquetas.trim().toLowerCase();

    return this.etiquetasDisponiveis.filter((etiqueta) => {
      const aindaNaoSelecionada = !etiquetasSelecionadas.some((nome) => this.etiquetasIguais(nome, etiqueta.nome));
      const correspondeBusca = !busca || etiqueta.nome.toLowerCase().includes(busca);
      return aindaNaoSelecionada && correspondeBusca;
    });
  }

  get temEtiquetasSelecionadas(): boolean {
    return this.etiquetasSelecionadas.length > 0;
  }

  get podeCriarEtiqueta(): boolean {
    const valor = this.ticketForm.controls.novaEtiqueta.value.trim();
    const existeNaColecao = this.etiquetasDisponiveis.some((etiqueta) => this.etiquetasIguais(etiqueta.nome, valor));
    const jaSelecionada = this.ticketForm.controls.etiquetas.value.some((etiqueta) => this.etiquetasIguais(etiqueta, valor));

    return !!valor && !existeNaColecao && !jaSelecionada;
  }

  fechar(): void {
    this.visible = false;
  }

  onDialogHide(): void {
    void this.router.navigate(['/tickets']);
  }

  salvar(): void {
    if (this.salvando) {
      return;
    }

    if (this.ticketForm.invalid) {
      this.ticketForm.markAllAsTouched();
      return;
    }

    if (this.descricaoEmEdicao) {
      this.aplicarDescricaoEditada();
    }

    const tituloLimpo = this.ticketForm.controls.titulo.value.trim();
    this.salvando = true;
    const payload = this.montarPayload(tituloLimpo);
    const requisicao$ = this.isEdicao
      ? this.ticketsService.atualizarTicket(payload)
      : this.ticketsService.criarTicket(payload);

    requisicao$.subscribe({
      next: () => this.fechar(),
      error: () => {
        this.salvando = false;
      },
    });
  }

  private carregarTicket(id: string): void {
    this.ticketsService.buscarTicketPorId(id).subscribe({
      next: (ticket) => {
        this.ticketOriginal = ticket;
        this.ticketForm.patchValue({
          titulo: ticket.titulo,
          descricao: ticket.descricao ?? '',
          etiquetas: ticket.etiquetas ?? [],
          colunaSelecionada: this.colunaParaValor(ticket.coluna, ticket.status),
          dataInicio: this.stringParaData(ticket.dataInicio ?? ticket.dtAbertura),
          dataFinal: this.stringParaData(ticket.dataFinal ?? null),
          membrosSelecionados: ticket.membros ?? this.mapearMembrosPorNome(ticket.desenvolvedor?.nome),
        });
        this.descricaoHtmlAtual = ticket.descricao ?? '';
      },
      error: () => {
        void this.router.navigate(['/tickets']);
      },
    });
  }

  private carregarUsuarios(): void {
    this.usuariosService.buscarUsuarios().subscribe({
      next: (usuarios) => {
        this.membrosDisponiveis = usuarios;
      },
    });
  }

  private carregarEtiquetas(): void {
    this.etiquetasService.buscarEtiquetas().subscribe({
      next: (etiquetas) => {
        this.etiquetasDisponiveis = etiquetas;
      },
    });
  }

  private criarEtiqueta(nome: string): void {
    if (this.criandoEtiqueta) {
      return;
    }

    this.criandoEtiqueta = true;
    this.etiquetasService.criarEtiqueta({
      nome,
      cor: this.corNovaEtiqueta,
    }).subscribe({
      next: (etiqueta) => {
        this.etiquetasDisponiveis = [...this.etiquetasDisponiveis, etiqueta];
        this.selecionarEtiqueta(etiqueta);
        this.criandoEtiqueta = false;
      },
      error: () => {
        this.criandoEtiqueta = false;
      },
    });
  }

  private montarPayload(tituloLimpo: string): Ticket {
    const agora = new Date();
    const colunaSelecionada = this.ticketForm.controls.colunaSelecionada.value;
    const dataInicio = this.ticketForm.controls.dataInicio.value;
    const dataFinal = this.ticketForm.controls.dataFinal.value;
    const membrosSelecionados = this.ticketForm.controls.membrosSelecionados.value;
    const etiquetas = this.ticketForm.controls.etiquetas.value;
    const descricao = this.ticketForm.controls.descricao.value.trim();

    const ticketId = this.ticketOriginal?.ticketId ?? this.gerarTicketId(agora);
    const statusLabel = this.colunas.find((coluna) => coluna.value === colunaSelecionada)?.label ?? 'Backlog';
    const desenvolvedorSelecionado = this.buscarDesenvolvedorSelecionado(membrosSelecionados);

    return {
      id: this.ticketOriginal?.id ?? ticketId,
      ticketId,
      dtAbertura: this.ticketOriginal?.dtAbertura ?? this.dataParaString(dataInicio ?? agora),
      desenvolvedor: desenvolvedorSelecionado ?? this.ticketOriginal?.desenvolvedor ?? this.membroPadrao(),
      titulo: tituloLimpo,
      projeto: this.ticketOriginal?.projeto ?? 'Teste 01',
      tipo: this.ticketOriginal?.tipo ?? 'Feature',
      prioridade: this.ticketOriginal?.prioridade ?? 'Medium',
      status: statusLabel,
      branch: this.ticketOriginal?.branch ?? this.gerarBranch(tituloLimpo),
      descricao,
      etiquetas: [...etiquetas],
      dataInicio: this.dataParaStringOuNulo(dataInicio),
      dataFinal: this.dataParaStringOuNulo(dataFinal),
      membros: [...membrosSelecionados],
      coluna: colunaSelecionada,
    };
  }

  private aplicarDescricaoEditada(): void {
    this.ticketForm.controls.descricao.setValue(this.descricaoHtmlAtual);
  }

  private colunaParaValor(coluna: string | undefined, status: string): string {
    if (coluna && this.colunas.some((item) => item.value === coluna)) {
      return coluna;
    }

    const statusTexto = status.trim();
    const option = this.colunas.find((item) => item.label.toLowerCase() === statusTexto.toLowerCase());
    if (option) {
      return option.value;
    }

    if (!statusTexto) {
      return 'backlog';
    }

    const valorCustomizado = statusTexto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const valor = valorCustomizado || 'backlog';
    if (!this.colunas.some((item) => item.value === valor)) {
      this.colunas = [...this.colunas, { label: statusTexto, value: valor }];
    }

    return valor;
  }

  private dataParaString(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private dataParaStringOuNulo(data: Date | null): string | null {
    if (!data) {
      return null;
    }

    return this.dataParaString(data);
  }

  private stringParaData(valor: string | null | undefined): Date | null {
    if (!valor) {
      return null;
    }

    const [ano, mes, dia] = valor.split('-').map(Number);
    if (!ano || !mes || !dia) {
      return null;
    }

    return new Date(ano, mes - 1, dia);
  }

  private gerarTicketId(baseDate: Date): string {
    const ano = baseDate.getFullYear();
    const mes = String(baseDate.getMonth() + 1).padStart(2, '0');
    const dia = String(baseDate.getDate()).padStart(2, '0');
    const sufixo = String(Math.floor(Math.random() * 900) + 100);

    return `${ano}${mes}${dia}.T${sufixo}`;
  }

  private gerarBranch(titulo: string): string {
    const slug = titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return `feature/${slug || 'novo-ticket'}`;
  }

  private membroPadrao(): { nome: string; foto: string } {
    const primeiroMembro = this.membrosDisponiveis[0];
    return {
      nome: primeiroMembro?.nome ?? 'Sem desenvolvedor',
      foto: primeiroMembro?.foto ?? 'https://ui-avatars.com/api/?name=Sem+Dev&background=f3f4f6&color=374151',
    };
  }

  private buscarDesenvolvedorSelecionado(membrosSelecionados: number[]): { nome: string; foto: string } | null {
    const idMembro = membrosSelecionados[0];
    if (!idMembro) {
      return null;
    }

    const membro = this.membrosDisponiveis.find((item) => item.id === idMembro);
    if (!membro) {
      return null;
    }

    return {
      nome: membro.nome,
      foto: membro.foto,
    };
  }

  private mapearMembrosPorNome(nome: string | undefined): number[] {
    if (!nome) {
      return [];
    }

    const membro = this.membrosDisponiveis.find((item) => item.nome === nome);
    return membro ? [membro.id] : [];
  }

  private limparNovaEtiqueta(): void {
    this.ticketForm.controls.novaEtiqueta.setValue('');
    this.termoBuscaEtiquetas = '';
    this.corNovaEtiqueta = this.coresEtiquetas[0];
  }

  private etiquetasIguais(primeira: string, segunda: string): boolean {
    return primeira.trim().toLowerCase() === segunda.trim().toLowerCase();
  }

  private textoObrigatorioSemEspacos(control: AbstractControl<string>): ValidationErrors | null {
    const valor = (control.value ?? '').trim();
    return valor ? null : { required: true };
  }
}

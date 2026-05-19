import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { AbstractControl, FormsModule, ReactiveFormsModule, ValidationErrors, Validators, NonNullableFormBuilder } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { AutoFocus } from 'primeng/autofocus';
import { CheckboxModule } from 'primeng/checkbox';
import { Chip } from 'primeng/chip';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { InplaceModule } from 'primeng/inplace';
import { InputText } from 'primeng/inputtext';
import { Popover, PopoverModule } from 'primeng/popover';
import { ProgressBarModule } from 'primeng/progressbar';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { EditorTextChangeEvent } from 'primeng/types/editor';
import { forkJoin } from 'rxjs';
import { Etiqueta, EtiquetasService } from '../etiquetas-service';
import { TICKET_KANBAN_COLUMNS } from '../kanban-columns';
import { TicketsService, Ticket, TicketArquivo, TicketChecklist, TicketChecklistItem, NovoTicketArquivo } from '../tickets-service';
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

type TicketArquivoVisual = TicketArquivo & {
  pendente?: boolean;
};

@Component({
  selector: 'app-form',
  imports: [
    AvatarModule,
    AutoFocus,
    Button,
    CheckboxModule,
    Chip,
    DatePicker,
    Dialog,
    EditorModule,
    FormsModule,
    InplaceModule,
    ReactiveFormsModule,
    InputText,
    PopoverModule,
    ProgressBarModule,
    Select,
    TooltipModule
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
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  visible = true;
  salvando = false;
  isEdicao = false;
  descricaoEmEdicao = true;
  termoBuscaMembros = '';
  termoBuscaEtiquetas = '';
  checklist: TicketChecklist | null = null;
  arquivos: TicketArquivoVisual[] = [];
  tituloNovoChecklist = '';
  textoNovoItemChecklist = '';
  itemChecklistEmEdicaoId: string | null = null;
  textoEdicaoItemChecklist = '';
  adicionandoItemChecklist = false;
  ocultarItensConcluidos = false;
  anexandoArquivos = false;
  private checklistPersistido = false;
  private arquivosPendentes: TicketArquivoVisual[] = [];
  criandoEtiqueta = false;
  private descricaoAntesEdicao = '';
  private descricaoHtmlAtual = '';

  colunas: Option[] = [...TICKET_KANBAN_COLUMNS];
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
    dataRange: this.formBuilder.control<Date[] | null>(null),
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

  atualizarTituloNovoChecklist(event: Event): void {
    this.tituloNovoChecklist = (event.target as HTMLInputElement).value;
  }

  criarChecklist(popover?: Popover): void {
    const titulo = this.tituloNovoChecklist.trim();
    if (!titulo) {
      return;
    }

    this.checklist = {
      id: this.gerarIdLocal('checklist'),
      ticketId: this.ticketOriginal?.id ?? '',
      titulo,
      itens: [],
    };
    this.checklistPersistido = false;
    this.tituloNovoChecklist = '';
    this.adicionandoItemChecklist = true;
    popover?.hide();
    this.persistirChecklistAtual();
  }

  excluirChecklist(): void {
    const checklistId = this.checklist?.id;
    const deveExcluirChecklistPersistido = this.isEdicao && this.checklistPersistido && !!checklistId;

    this.checklist = null;
    this.checklistPersistido = false;
    this.tituloNovoChecklist = '';
    this.textoNovoItemChecklist = '';
    this.itemChecklistEmEdicaoId = null;
    this.textoEdicaoItemChecklist = '';
    this.adicionandoItemChecklist = false;
    this.ocultarItensConcluidos = false;

    if (deveExcluirChecklistPersistido) {
      this.ticketsService.excluirChecklist(checklistId).subscribe();
    }
  }

  abrirAdicaoItemChecklist(): void {
    this.adicionandoItemChecklist = true;
  }

  atualizarTextoNovoItemChecklist(event: Event): void {
    this.textoNovoItemChecklist = (event.target as HTMLInputElement).value;
  }

  adicionarItemChecklist(event?: Event, closeCallback?: (event: Event) => void): void {
    const texto = this.textoNovoItemChecklist.trim();
    if (!this.checklist || !texto) {
      return;
    }

    this.checklist = {
      ...this.checklist,
      itens: [
        ...this.checklist.itens,
        {
          id: this.gerarIdLocal('item'),
          texto,
          concluido: false,
        },
      ],
    };
    this.textoNovoItemChecklist = '';
    this.adicionandoItemChecklist = false;
    closeCallback?.(event ?? new Event('click'));
    this.persistirChecklistAtual();
  }

  cancelarAdicaoItemChecklist(event?: Event, closeCallback?: (event: Event) => void): void {
    this.textoNovoItemChecklist = '';
    this.adicionandoItemChecklist = false;
    closeCallback?.(event ?? new Event('click'));
  }

  alternarItemChecklist(item: TicketChecklistItem, concluido: boolean): void {
    if (!this.checklist) {
      return;
    }

    this.checklist = {
      ...this.checklist,
      itens: this.checklist.itens.map((itemAtual) => (
        itemAtual.id === item.id ? { ...itemAtual, concluido } : itemAtual
      )),
    };
    this.persistirChecklistAtual();
  }

  iniciarEdicaoItemChecklist(item: TicketChecklistItem): void {
    this.itemChecklistEmEdicaoId = item.id;
    this.textoEdicaoItemChecklist = item.texto;
  }

  atualizarTextoEdicaoItemChecklist(event: Event): void {
    this.textoEdicaoItemChecklist = (event.target as HTMLInputElement).value;
  }

  salvarEdicaoItemChecklist(item: TicketChecklistItem, event?: Event, closeCallback?: (event: Event) => void): void {
    const texto = this.textoEdicaoItemChecklist.trim();
    if (!this.checklist || !texto) {
      return;
    }

    this.checklist = {
      ...this.checklist,
      itens: this.checklist.itens.map((itemAtual) => (
        itemAtual.id === item.id ? { ...itemAtual, texto } : itemAtual
      )),
    };
    this.limparEdicaoItemChecklist();
    closeCallback?.(event ?? new Event('click'));
    this.persistirChecklistAtual();
  }

  cancelarEdicaoItemChecklist(event?: Event, closeCallback?: (event: Event) => void): void {
    this.limparEdicaoItemChecklist();
    closeCallback?.(event ?? new Event('click'));
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

  limparDatas(): void {
    this.ticketForm.controls.dataRange.setValue(null);
  }

  selecionarArquivos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivosSelecionados = Array.from(input.files ?? []);
    input.value = '';

    if (!arquivosSelecionados.length || this.anexandoArquivos) {
      return;
    }

    this.anexandoArquivos = true;
    void Promise.all(arquivosSelecionados.map((arquivo) => this.montarArquivoVisual(arquivo)))
      .then((arquivos) => this.adicionarArquivos(arquivos))
      .catch(() => {
        this.anexandoArquivos = false;
        this.atualizarTela();
      });
  }

  abrirArquivo(arquivo: TicketArquivoVisual): void {
    if (!arquivo.conteudo) {
      return;
    }

    window.open(arquivo.conteudo, '_blank', 'noopener');
  }

  removerArquivo(arquivo: TicketArquivoVisual): void {
    if (arquivo.pendente) {
      this.arquivos = this.arquivos.filter((item) => item.id !== arquivo.id);
      this.arquivosPendentes = this.arquivosPendentes.filter((item) => item.id !== arquivo.id);
      return;
    }

    this.ticketsService.excluirArquivo(arquivo.id).subscribe({
      next: () => {
        this.arquivos = this.arquivos.filter((item) => item.id !== arquivo.id);
      },
    });
  }

  ehImagem(arquivo: TicketArquivoVisual): boolean {
    return arquivo.tipo.startsWith('image/');
  }

  extensaoArquivo(nome: string): string {
    const partes = nome.split('.');
    const extensao = partes.length > 1 ? partes.at(-1)?.trim().toUpperCase() : '';
    return extensao ? extensao.slice(0, 4) : 'ARQ';
  }

  formatarDataArquivo(criadoEm: string): string {
    const data = new Date(criadoEm);
    if (Number.isNaN(data.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(data);
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

  get temChecklist(): boolean {
    return !!this.checklist;
  }

  get podeCriarChecklist(): boolean {
    return !!this.tituloNovoChecklist.trim();
  }

  get podeAdicionarItemChecklist(): boolean {
    return !!this.textoNovoItemChecklist.trim();
  }

  get itensChecklistVisiveis(): TicketChecklistItem[] {
    const itens = this.checklist?.itens ?? [];
    return this.ocultarItensConcluidos ? itens.filter((item) => !item.concluido) : itens;
  }

  get percentualChecklist(): number {
    const itens = this.checklist?.itens ?? [];
    if (!itens.length) {
      return 0;
    }

    const concluidos = itens.filter((item) => item.concluido).length;
    return Math.round((concluidos / itens.length) * 100);
  }

  get temItensChecklistConcluidos(): boolean {
    return (this.checklist?.itens ?? []).some((item) => item.concluido);
  }

  get temArquivos(): boolean {
    return this.arquivos.length > 0;
  }

  get temDatasSelecionadas(): boolean {
    return this.datasSelecionadas.length > 0;
  }

  get datasSelecionadas(): Date[] {
    return (this.ticketForm.controls.dataRange.value ?? []).filter((data): data is Date => data instanceof Date);
  }

  get datasFormatadas(): string {
    return this.datasSelecionadas
      .map((data) => this.formatarDataResumo(data))
      .filter(Boolean)
      .join(' - ');
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
      next: (ticketSalvo) => {
        this.ticketOriginal = ticketSalvo;
        this.persistirChecklistAposSalvar(ticketSalvo, () => {
          this.finalizarSalvamento(ticketSalvo);
        });
      },
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
          dataRange: this.montarDataRange(ticket.dataInicio ?? ticket.dtAbertura, ticket.dataFinal ?? null),
          membrosSelecionados: ticket.membros ?? this.mapearMembrosPorNome(ticket.desenvolvedor?.nome),
        });
        this.descricaoHtmlAtual = ticket.descricao ?? '';
        this.carregarChecklist(ticket.id);
        this.carregarArquivos(ticket.id);
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
    const [dataInicio, dataFinal] = this.datasSelecionadas;
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

  private carregarChecklist(ticketId: string): void {
    this.ticketsService.buscarChecklistPorTicketId(ticketId).subscribe({
      next: (checklist) => {
        this.checklist = checklist;
        this.checklistPersistido = !!checklist;
      },
    });
  }

  private carregarArquivos(ticketId: string): void {
    this.ticketsService.buscarArquivosPorTicketId(ticketId).subscribe({
      next: (arquivos) => {
        this.arquivos = this.ordenarArquivos(arquivos);
      },
    });
  }

  private adicionarArquivos(arquivos: TicketArquivoVisual[]): void {
    if (!arquivos.length) {
      this.anexandoArquivos = false;
      this.atualizarTela();
      return;
    }

    const ticketId = this.ticketOriginal?.id ?? '';
    const arquivosPendentes = arquivos.map((arquivo) => ({ ...arquivo, ticketId, pendente: true }));
    this.arquivos = this.ordenarArquivos([...this.arquivos, ...arquivosPendentes]);
    this.arquivosPendentes = [...this.arquivosPendentes, ...arquivosPendentes];
    this.anexandoArquivos = false;
    this.atualizarTela();

    if (this.isEdicao && this.ticketOriginal) {
      this.persistirArquivosPendentes(arquivosPendentes, this.ticketOriginal.id);
    }
  }

  private persistirChecklistAtual(): void {
    if (!this.isEdicao || !this.ticketOriginal || !this.checklist) {
      return;
    }

    const checklist: TicketChecklist = {
      ...this.checklist,
      ticketId: this.ticketOriginal.id,
      itens: [...this.checklist.itens],
    };
    const requisicao$ = this.checklistPersistido
      ? this.ticketsService.atualizarChecklist(checklist)
      : this.ticketsService.criarChecklist(checklist);

    requisicao$.subscribe({
      next: (checklistSalvo) => {
        this.checklist = checklistSalvo;
        this.checklistPersistido = true;
      },
    });
  }

  private persistirChecklistAposSalvar(ticket: Ticket, onComplete: () => void): void {
    if (!this.checklist) {
      onComplete();
      return;
    }

    const checklist: TicketChecklist = {
      ...this.checklist,
      ticketId: ticket.id,
      itens: [...this.checklist.itens],
    };
    const requisicao$ = this.checklistPersistido
      ? this.ticketsService.atualizarChecklist(checklist)
      : this.ticketsService.criarChecklist(checklist);

    requisicao$.subscribe({
      next: (checklistSalvo) => {
        this.checklist = checklistSalvo;
        this.checklistPersistido = true;
        onComplete();
      },
      error: () => {
        this.salvando = false;
      },
    });
  }

  private finalizarSalvamento(ticket: Ticket): void {
    if (!this.isEdicao && this.arquivosPendentes.length) {
      this.persistirArquivosPendentesAposSalvar(ticket, () => this.concluirSalvamento());
      return;
    }

    this.concluirSalvamento();
  }

  private concluirSalvamento(): void {
    this.salvando = false;
    this.fechar();
    this.atualizarTela();
  }

  private persistirArquivosPendentesAposSalvar(ticket: Ticket, onComplete: () => void): void {
    if (!this.arquivosPendentes.length) {
      onComplete();
      return;
    }

    this.persistirArquivosPendentes([...this.arquivosPendentes], ticket.id, onComplete, () => {
      this.salvando = false;
    });
  }

  private persistirArquivosPendentes(
    arquivosPendentes: TicketArquivoVisual[],
    ticketId: string,
    onComplete?: () => void,
    onError?: () => void,
  ): void {
    if (!arquivosPendentes.length) {
      onComplete?.();
      return;
    }

    const idsPendentes = new Set(arquivosPendentes.map((arquivo) => arquivo.id));
    const payloads = arquivosPendentes.map((arquivo) => this.montarPayloadArquivo(arquivo, ticketId));

    this.persistirArquivos(payloads, (arquivosSalvos) => {
      this.arquivos = this.ordenarArquivos([
        ...this.arquivos.filter((arquivo) => !idsPendentes.has(arquivo.id)),
        ...arquivosSalvos,
      ]);
      this.arquivosPendentes = this.arquivosPendentes.filter((arquivo) => !idsPendentes.has(arquivo.id));
      onComplete?.();
      this.atualizarTela();
    }, () => {
      onError?.();
      this.atualizarTela();
    });
  }

  private persistirArquivos(
    arquivos: NovoTicketArquivo[],
    onComplete: (arquivosSalvos: TicketArquivo[]) => void,
    onError: () => void,
  ): void {
    if (!arquivos.length) {
      onComplete([]);
      return;
    }

    forkJoin(arquivos.map((arquivo) => this.ticketsService.criarArquivo(arquivo))).subscribe({
      next: onComplete,
      error: onError,
    });
  }

  private async montarArquivoVisual(arquivo: File): Promise<TicketArquivoVisual> {
    const conteudo = await this.lerArquivoComoDataUrl(arquivo);

    return {
      id: this.gerarIdLocal('arquivo'),
      ticketId: this.ticketOriginal?.id ?? '',
      nome: arquivo.name,
      tipo: arquivo.type || this.inferirTipoArquivo(arquivo.name),
      tamanho: arquivo.size,
      conteudo,
      criadoEm: new Date().toISOString(),
    };
  }

  private montarPayloadArquivo(arquivo: TicketArquivoVisual, ticketId: string): NovoTicketArquivo {
    return {
      ticketId,
      nome: arquivo.nome,
      tipo: arquivo.tipo,
      tamanho: arquivo.tamanho,
      conteudo: arquivo.conteudo,
      criadoEm: arquivo.criadoEm,
    };
  }

  private lerArquivoComoDataUrl(arquivo: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(arquivo);
    });
  }

  private inferirTipoArquivo(nome: string): string {
    const extensao = this.extensaoArquivo(nome).toLowerCase();
    const tipos: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      txt: 'text/plain',
      csv: 'text/csv',
    };

    return tipos[extensao] ?? 'application/octet-stream';
  }

  private ordenarArquivos<T extends TicketArquivoVisual>(arquivos: T[]): T[] {
    return [...arquivos].sort((primeiro, segundo) => (
      new Date(segundo.criadoEm).getTime() - new Date(primeiro.criadoEm).getTime()
    ));
  }

  private atualizarTela(): void {
    this.changeDetectorRef.detectChanges();
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

  private montarDataRange(dataInicio: string | null | undefined, dataFinal: string | null | undefined): Date[] | null {
    const range = [
      this.stringParaData(dataInicio),
      this.stringParaData(dataFinal),
    ].filter((data): data is Date => !!data);

    return range.length ? range : null;
  }

  private formatarDataResumo(data: Date | null): string {
    if (!data) {
      return '';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
    }).format(data);
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

  private gerarIdLocal(prefixo: string): string {
    const sufixo = Math.random().toString(36).slice(2, 9);
    return `${prefixo}-${Date.now()}-${sufixo}`;
  }

  private limparEdicaoItemChecklist(): void {
    this.itemChecklistEmEdicaoId = null;
    this.textoEdicaoItemChecklist = '';
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

import { Component, inject, OnInit } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Usuario, UsuariosService } from '../usuarios-service';

@Component({
  selector: 'app-usuario-form',
  imports: [Avatar, Button, Dialog, InputText, ReactiveFormsModule],
  templateUrl: './form.html',
  styleUrl: './form.scss',
})
export class Form implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usuariosService = inject(UsuariosService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  visible = true;
  salvando = false;
  isEdicao = false;

  usuarioForm = this.formBuilder.group({
    nome: this.formBuilder.control('', { validators: [Validators.required] }),
    foto: this.formBuilder.control(''),
  });

  private usuarioOriginal: Usuario | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.isEdicao = true;
    this.carregarUsuario(id);
  }

  get fotoPreview(): string {
    const foto = this.usuarioForm.controls.foto.value.trim();
    const nome = this.usuarioForm.controls.nome.value.trim();

    return foto || this.gerarAvatarUrl(nome || 'Usuário');
  }

  fechar(): void {
    this.visible = false;
    void this.router.navigate(['/usuarios']);
  }

  onDialogHide(): void {
    void this.router.navigate(['/usuarios']);
  }

  salvar(): void {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    this.salvando = true;
    const nome = this.usuarioForm.controls.nome.value.trim();
    const foto = this.usuarioForm.controls.foto.value.trim() || this.gerarAvatarUrl(nome);
    const payload = { nome, foto };

    const request = this.isEdicao && this.usuarioOriginal
      ? this.usuariosService.atualizarUsuario({ ...payload, id: this.usuarioOriginal.id })
      : this.usuariosService.criarUsuario(payload);

    request.subscribe({
      next: () => this.fechar(),
      error: () => {
        this.salvando = false;
      },
    });
  }

  private carregarUsuario(id: string): void {
    this.usuariosService.buscarUsuarioPorId(id).subscribe({
      next: (usuario) => {
        this.usuarioOriginal = usuario;
        this.usuarioForm.patchValue({
          nome: usuario.nome,
          foto: usuario.foto,
        });
      },
      error: () => this.fechar(),
    });
  }

  private gerarAvatarUrl(nome: string): string {
    const nomeCodificado = encodeURIComponent(nome);
    return `https://ui-avatars.com/api/?name=${nomeCodificado}&background=f3f4f6&color=374151`;
  }
}

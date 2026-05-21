import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Usuario } from '../usuarios-service';

@Component({
  selector: 'app-usuarios-list',
  imports: [Avatar, Button, RouterLink, TableModule],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List {

  usuarios = input<Usuario[]>([]);
}

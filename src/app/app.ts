import { Component, signal } from '@angular/core';
import { Layout } from './core/layout/layout';

@Component({
  selector: 'app-root',
  imports: [Layout],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('er7_gestao-tarefas-ui-2');
}

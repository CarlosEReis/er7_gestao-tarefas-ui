import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./agenda').then((m) => m.Agenda),
  },
];

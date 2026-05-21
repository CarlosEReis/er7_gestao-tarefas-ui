import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./usuarios').then((m) => m.Usuarios),
    children: [
      { path: 'novo', loadComponent: () => import('./form/form').then((m) => m.Form) },
      { path: ':id/detalhe', loadComponent: () => import('./form/form').then((m) => m.Form) },
    ],
  },
];

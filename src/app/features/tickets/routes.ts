import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./tickets').then((m) => m.Tickets),
    children: [
      { path: 'novo', loadComponent: () => import('./form/form').then((m) => m.Form) },
      { path: ':id/detalhe', loadComponent: () => import('./form/form').then(m => m.Form) }
    ]
  },
];

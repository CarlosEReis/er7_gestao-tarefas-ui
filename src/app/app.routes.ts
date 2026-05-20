import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'tickets',
    loadChildren: () => import('./features/tickets/routes').then((m) => m.routes),
  },
  {
    path: 'projetos',
    loadChildren: () => import('./features/projetos/routes').then((m) => m.routes),
  }
];

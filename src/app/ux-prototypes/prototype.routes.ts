import { Routes } from '@angular/router';
import { P1Component } from './p1/p1.component';
import { PrototypeShellComponent } from './prototype-shell/prototype-shell.component';

export const PrototypeRoutes: Routes = [
  {
    path: 'p1',
    component: PrototypeShellComponent,
    children: [
      { path: '', component: P1Component }
    ]
  }
];

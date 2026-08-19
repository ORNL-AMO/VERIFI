import { NgModule } from '@angular/core';
import { Routes, RouterModule, ExtraOptions } from '@angular/router';
import { environment } from 'src/environments/environment';

const routes: Routes = [
  { path: 'p1', loadChildren: () => import('../ux-prototypes/ux-prototypes.module').then(module => module.UxPrototypesModule) },
  { path: 'v1', loadChildren: () => import('../v1/v1.module').then(module => module.V1Module) },
  { path: '', loadChildren: () => import('../v0/v0.module').then(module => module.V0Module) }
];

const routerOptions: ExtraOptions = {
  anchorScrolling: 'enabled',
  scrollPositionRestoration: 'enabled',
  useHash: environment.useHash
}

@NgModule({
  imports: [RouterModule.forRoot(routes, routerOptions)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

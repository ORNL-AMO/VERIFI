import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { P1Component } from './p1/p1.component';
import { PrototypeShellComponent } from './prototype-shell/prototype-shell.component';

@NgModule({
  declarations: [
    PrototypeShellComponent,
    P1Component
  ],
  exports: [
    PrototypeShellComponent,
    P1Component
  ],
  imports: [RouterModule]
})
export class UxPrototypesModule { }

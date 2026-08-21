import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { V1ShellComponent } from './shell/v1-shell.component';
import { V1Routes } from './v1.routes';

@NgModule({
  declarations: [
    V1ShellComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(V1Routes)
  ]
})
export class V1Module { }

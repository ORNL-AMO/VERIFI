import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmptyStateComponent } from './empty-state/empty-state.component';
import { FormsModule } from '@angular/forms';
import { HelperPipesModule } from '../shared/helper-pipes/helper-pipes.module';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    EmptyStateComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    HelperPipesModule,
    RouterModule
  ]
})
export class DashboardModule { }

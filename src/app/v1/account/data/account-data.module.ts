import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AccountCustomDataPlaceholderComponent } from './account-custom-data-placeholder.component';

@NgModule({
  declarations: [
    AccountCustomDataPlaceholderComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    AccountCustomDataPlaceholderComponent
  ]
})
export class AccountDataModule { }

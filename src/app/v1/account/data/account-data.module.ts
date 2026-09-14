import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IconsModule } from '@app/v1/shared/icons/icons.module';

import { AccountCustomDataPlaceholderComponent } from './account-custom-data-placeholder.component';

@NgModule({
  declarations: [
    AccountCustomDataPlaceholderComponent
  ],
  imports: [
    CommonModule,
    IconsModule
  ],
  exports: [
    AccountCustomDataPlaceholderComponent
  ]
})
export class AccountDataModule { }

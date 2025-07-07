import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountSettingsHelpComponent } from './account-settings-help/account-settings-help.component';



@NgModule({
  declarations: [
    AccountSettingsHelpComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    AccountSettingsHelpComponent
  ]
})
export class SharedHelpContentModule { }

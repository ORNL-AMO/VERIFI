import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountSettingsHelpComponent } from './account-settings-help/account-settings-help.component';
import { FacilitySettingsHelpComponent } from './facility-settings-help/facility-settings-help.component';



@NgModule({
  declarations: [
    AccountSettingsHelpComponent,
    FacilitySettingsHelpComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    AccountSettingsHelpComponent,
    FacilitySettingsHelpComponent
  ]
})
export class SharedHelpContentModule { }

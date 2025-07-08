import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HelpPanelComponent } from './help-panel.component';
import { HelpPageComponent } from './help-page/help-page.component';
import { AccountHelpModule } from './account-help/account-help.module';
import { FacilityHelpModule } from './facility-help/facility-help.module';
import { SharedHelpContentModule } from '../shared/shared-help-content/shared-help-content.module';

@NgModule({
  declarations: [
    HelpPanelComponent,
    HelpPageComponent,
  ],
  imports: [
    CommonModule,
    AccountHelpModule,
    FacilityHelpModule,
    SharedHelpContentModule
  ],
  exports: [
    HelpPanelComponent
  ]
})
export class HelpPanelModule { }

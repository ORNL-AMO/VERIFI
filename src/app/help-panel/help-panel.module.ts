import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HelpPanelComponent } from './help-panel.component';
import { HelpPageComponent } from './help-page/help-page.component';
import { UploadDataHelpModule } from './upload-data-help/upload-data-help.module';
import { SetupWizardHelpModule } from './setup-wizard-help/setup-wizard-help.module';
import { AccountHelpModule } from './account-help/account-help.module';
import { FacilityHelpModule } from './facility-help/facility-help.module';

@NgModule({
  declarations: [
    HelpPanelComponent,
    HelpPageComponent,
  ],
  imports: [
    CommonModule,
    UploadDataHelpModule,
    SetupWizardHelpModule,
    AccountHelpModule,
    FacilityHelpModule
  ],
  exports: [
    HelpPanelComponent
  ]
})
export class HelpPanelModule { }

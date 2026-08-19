import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HelpPanelComponent } from '@v0/data-evaluation/help-panel/help-panel.component';
import { HelpPageComponent } from '@v0/data-evaluation/help-panel/help-page/help-page.component';
import { AccountHelpModule } from '@v0/data-evaluation/help-panel/account-help/account-help.module';
import { FacilityHelpModule } from '@v0/data-evaluation/help-panel/facility-help/facility-help.module';
import { SharedHelpContentModule } from '@v0/shared/shared-help-content/shared-help-content.module';

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

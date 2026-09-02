import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataEvaluationComponent } from '@v0/data-evaluation/data-evaluation.component';
import { SidebarComponent } from '@v0/data-evaluation/sidebar/sidebar.component';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from '@v0/shared/helper-pipes/_helper-pipes.module';
import { FacilityListPipe } from '@v0/data-evaluation/sidebar/facility-list.pipe';
import { HelpPanelModule } from '@v0/data-evaluation/help-panel/help-panel.module';
import { AccountModule } from '@v0/data-evaluation/account/account.module';
import { FacilityModule } from '@v0/data-evaluation/facility/facility.module';
import { HideAccountLinksPipe } from '@v0/data-evaluation/sidebar/hide-account-links.pipe';
import { HideFacilityLinksPipe } from '@v0/data-evaluation/sidebar/hide-facility-links.pipe';

@NgModule({
  declarations: [
    DataEvaluationComponent,
    SidebarComponent,
    FacilityListPipe,
    HideAccountLinksPipe,
    HideFacilityLinksPipe
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    HelpPanelModule,
    AccountModule,
    FacilityModule
  ]
})
export class DataEvaluationModule { }

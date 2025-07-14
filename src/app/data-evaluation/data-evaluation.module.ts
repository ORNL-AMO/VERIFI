import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataEvaluationComponent } from './data-evaluation.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from '../shared/helper-pipes/_helper-pipes.module';
import { FacilityListPipe } from './sidebar/facility-list.pipe';
import { HelpPanelModule } from './help-panel/help-panel.module';
import { AccountModule } from './account/account.module';
import { FacilityModule } from './facility/facility.module';
import { HideAccountLinksPipe } from './sidebar/hide-account-links.pipe';
import { HideFacilityLinksPipe } from './sidebar/hide-facility-links.pipe';



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

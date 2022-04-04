import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountAnalysisComponent } from './account-analysis.component';
import { AccountAnalysisDashboardComponent } from './account-analysis-dashboard/account-analysis-dashboard.component';
import { AccountAnalysisBannerComponent } from './account-analysis-banner/account-analysis-banner.component';
import { RouterModule } from '@angular/router';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { AccountAnalysisSetupComponent } from './account-analysis-setup/account-analysis-setup.component';
import { SelectFacilityAnalysisItemsComponent } from './select-facility-analysis-items/select-facility-analysis-items.component';
import { SelectItemTableComponent } from './select-facility-analysis-items/select-item-table/select-item-table.component';



@NgModule({
  declarations: [
    AccountAnalysisComponent,
    AccountAnalysisDashboardComponent,
    AccountAnalysisBannerComponent,
    AccountAnalysisSetupComponent,
    SelectFacilityAnalysisItemsComponent,
    SelectItemTableComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    NgbPaginationModule,
    FormsModule,
    HelperPipesModule
  ]
})
export class AccountAnalysisModule { }

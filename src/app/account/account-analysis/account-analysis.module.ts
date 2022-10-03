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
import { AccountAnalysisResultsComponent } from './account-analysis-results/account-analysis-results.component';
import { MonthlyAccountAnalysisComponent } from './account-analysis-results/monthly-account-analysis/monthly-account-analysis.component';
import { AnnualAccountAnalysisComponent } from './account-analysis-results/annual-account-analysis/annual-account-analysis.component';
import { SharedAnalysisModule } from 'src/app/shared/shared-analysis/shared-analysis.module';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';


@NgModule({
  declarations: [
    AccountAnalysisComponent,
    AccountAnalysisDashboardComponent,
    AccountAnalysisBannerComponent,
    AccountAnalysisSetupComponent,
    SelectFacilityAnalysisItemsComponent,
    SelectItemTableComponent,
    AccountAnalysisResultsComponent,
    MonthlyAccountAnalysisComponent,
    AnnualAccountAnalysisComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    NgbPaginationModule,
    FormsModule,
    HelperPipesModule,
    SharedAnalysisModule,
    CalculatingSpinnerModule
  ]
})
export class AccountAnalysisModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountAnalysisComponent } from '@v0/data-evaluation/account/account-analysis/account-analysis.component';
import { AccountAnalysisDashboardComponent } from '@v0/data-evaluation/account/account-analysis/account-analysis-dashboard/account-analysis-dashboard.component';
import { AccountAnalysisBannerComponent } from '@v0/data-evaluation/account/account-analysis/account-analysis-banner/account-analysis-banner.component';
import { RouterModule } from '@angular/router';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HelperPipesModule } from '@shared/helper-pipes/_helper-pipes.module';
import { AccountAnalysisSetupComponent } from '@v0/data-evaluation/account/account-analysis/account-analysis-setup/account-analysis-setup.component';
import { SelectFacilityAnalysisItemsComponent } from '@v0/data-evaluation/account/account-analysis/select-facility-analysis-items/select-facility-analysis-items.component';
import { SelectItemTableComponent } from '@v0/data-evaluation/account/account-analysis/select-facility-analysis-items/select-item-table/select-item-table.component';
import { AccountAnalysisResultsComponent } from '@v0/data-evaluation/account/account-analysis/account-analysis-results/account-analysis-results.component';
import { MonthlyAccountAnalysisComponent } from '@v0/data-evaluation/account/account-analysis/account-analysis-results/monthly-account-analysis/monthly-account-analysis.component';
import { AnnualAccountAnalysisComponent } from '@v0/data-evaluation/account/account-analysis/account-analysis-results/annual-account-analysis/annual-account-analysis.component';
import { SharedAnalysisModule } from '@shared/shared-analysis/shared-analysis.module';
import { CalculatingSpinnerModule } from '@shared/calculating-spinner/calculating-spinner.module';
import { AccountAnalysisFooterComponent } from '@v0/data-evaluation/account/account-analysis/account-analysis-footer/account-analysis-footer.component';
import { TableItemsDropdownModule } from '@shared/table-items-dropdown/table-items-dropdown.module';
import { AccountAnalysisFacilitiesSummaryComponent } from '@v0/data-evaluation/account/account-analysis/account-analysis-results/account-analysis-facilities-summary/account-analysis-facilities-summary.component';
import { LabelWithTooltipModule } from '@shared/label-with-tooltip/label-with-tooltip.module';
import { AccountAnalysisDetailsTableComponent } from '@v0/data-evaluation/account/account-analysis/account-analysis-dashboard/account-analysis-details-table/account-analysis-details-table.component';


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
    AnnualAccountAnalysisComponent,
    AccountAnalysisFooterComponent,
    AccountAnalysisFacilitiesSummaryComponent,
    AccountAnalysisDetailsTableComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    NgbPaginationModule,
    FormsModule,
    ReactiveFormsModule,
    HelperPipesModule,
    SharedAnalysisModule,
    CalculatingSpinnerModule,
    TableItemsDropdownModule,
    LabelWithTooltipModule
  ]
})
export class AccountAnalysisModule { }

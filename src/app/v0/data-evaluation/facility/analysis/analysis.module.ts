import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisComponent } from '@v0/data-evaluation/facility/analysis/analysis.component';
import { RunAnalysisComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/run-analysis.component';
import { AnalysisBannerComponent } from '@v0/data-evaluation/facility/analysis/analysis-banner/analysis-banner.component';
import { AnalysisDashboardComponent } from '@v0/data-evaluation/facility/analysis/analysis-dashboard/analysis-dashboard.component';
import { FacilityAnalysisComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/facility-analysis/facility-analysis.component';
import { GroupAnalysisComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/group-analysis/group-analysis.component';
import { GroupAnalysisOptionsComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/group-analysis/group-analysis-options/group-analysis-options.component';
import { AnalysisSetupComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/analysis-setup/analysis-setup.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from '@v0/shared/helper-pipes/_helper-pipes.module';
import { RegressionModelSelectionComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/group-analysis/regression-model-selection/regression-model-selection.component';
import { AnnualAnalysisSummaryComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/group-analysis/annual-analysis-summary/annual-analysis-summary.component';
import { MonthlyAnalysisSummaryComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/group-analysis/monthly-analysis-summary/monthly-analysis-summary.component';
import { MonthlyFacilityAnalysisComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/facility-analysis/monthly-facility-analysis/monthly-facility-analysis.component';
import { AnnualFacilityAnalysisComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/facility-analysis/annual-facility-analysis/annual-facility-analysis.component';
import { SharedAnalysisModule } from '@v0/shared/shared-analysis/shared-analysis.module';
import { RegressionModelMenuComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/group-analysis/regression-model-selection/regression-model-menu/regression-model-menu.component';
import { CalculatingSpinnerModule } from '@v0/shared/calculating-spinner/calculating-spinner.module';
import { AccountAnalysisListComponent } from '@v0/data-evaluation/facility/analysis/account-analysis-list/account-analysis-list.component';
import { AnalysisFooterComponent } from '@v0/data-evaluation/facility/analysis/analysis-footer/analysis-footer.component';
import { TableItemsDropdownModule } from '@v0/shared/table-items-dropdown/table-items-dropdown.module';
import { RegressionModelInspectionComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/group-analysis/regression-model-selection/regression-model-inspection/regression-model-inspection.component';
import { LabelWithTooltipModule } from '@v0/shared/label-with-tooltip/label-with-tooltip.module';
import { SelectBankedAnalysisComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/analysis-setup/select-banked-analysis/select-banked-analysis.component';
import { BankedGroupsDetailsComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/analysis-setup/select-banked-analysis/banked-groups-details/banked-groups-details.component';
import { SharedReportsModule } from "@v0/shared/shared-reports/shared-reports.module";
import { BankedGroupAnalysisComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/group-analysis/banked-group-analysis/banked-group-analysis.component';
import { BankedGroupResultsTableComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/group-analysis/group-analysis-options/banked-group-results-table/banked-group-results-table.component';
import { RegressionUserDefinedModelInspectionComponent } from '@v0/data-evaluation/facility/analysis/run-analysis/group-analysis/regression-model-selection/regression-user-defined-model-inspection/regression-user-defined-model-inspection.component';
import { AnalysisDetailItemCardComponent } from '@v0/data-evaluation/facility/analysis/analysis-dashboard/analysis-detail-item-card/analysis-detail-item-card.component';
import { AnalysisDetailsTableComponent } from '@v0/data-evaluation/facility/analysis/analysis-dashboard/analysis-details-table/analysis-details-table.component';
import { RegressionModelComparison } from '@v0/data-evaluation/facility/analysis/run-analysis/group-analysis/regression-model-selection/regression-model-comparison/regression-model-comparison';

@NgModule({
  declarations: [
    AnalysisComponent,
    RunAnalysisComponent,
    AnalysisBannerComponent,
    AnalysisDashboardComponent,
    FacilityAnalysisComponent,
    GroupAnalysisComponent,
    GroupAnalysisOptionsComponent,
    AnalysisSetupComponent,
    RegressionModelSelectionComponent,
    AnnualAnalysisSummaryComponent,
    MonthlyAnalysisSummaryComponent,
    MonthlyFacilityAnalysisComponent,
    AnnualFacilityAnalysisComponent,
    RegressionModelMenuComponent,
    AccountAnalysisListComponent,
    AnalysisFooterComponent,
    RegressionModelInspectionComponent,
    SelectBankedAnalysisComponent,
    BankedGroupsDetailsComponent,
    BankedGroupAnalysisComponent,
    BankedGroupResultsTableComponent,
    RegressionUserDefinedModelInspectionComponent,
    AnalysisDetailItemCardComponent,
    AnalysisDetailsTableComponent,
    RegressionModelComparison
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    HelperPipesModule,
    NgbPaginationModule,
    SharedAnalysisModule,
    CalculatingSpinnerModule,
    TableItemsDropdownModule,
    LabelWithTooltipModule,
    SharedReportsModule
]
})
export class AnalysisModule { }

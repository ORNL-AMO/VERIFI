import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisComponent } from './analysis.component';
import { RunAnalysisComponent } from './run-analysis/run-analysis.component';
import { AnalysisBannerComponent } from './analysis-banner/analysis-banner.component';
import { AnalysisDashboardComponent } from './analysis-dashboard/analysis-dashboard.component';
import { FacilityAnalysisComponent } from './run-analysis/facility-analysis/facility-analysis.component';
import { GroupAnalysisComponent } from './run-analysis/group-analysis/group-analysis.component';
import { GroupAnalysisOptionsComponent } from './run-analysis/group-analysis/group-analysis-options/group-analysis-options.component';
import { AnalysisSetupComponent } from './run-analysis/analysis-setup/analysis-setup.component';
import { FormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from '../../shared/helper-pipes/_helper-pipes.module';
import { RegressionModelSelectionComponent } from './run-analysis/group-analysis/regression-model-selection/regression-model-selection.component';
import { AnnualAnalysisSummaryComponent } from './run-analysis/group-analysis/annual-analysis-summary/annual-analysis-summary.component';
import { MonthlyAnalysisSummaryComponent } from './run-analysis/group-analysis/monthly-analysis-summary/monthly-analysis-summary.component';
import { MonthlyFacilityAnalysisComponent } from './run-analysis/facility-analysis/monthly-facility-analysis/monthly-facility-analysis.component';
import { AnnualFacilityAnalysisComponent } from './run-analysis/facility-analysis/annual-facility-analysis/annual-facility-analysis.component';
import { SharedAnalysisModule } from 'src/app/shared/shared-analysis/shared-analysis.module';
import { ModelFilterPipe } from './run-analysis/group-analysis/regression-model-selection/model-filter.pipe';
import { RegressionModelMenuComponent } from './run-analysis/group-analysis/regression-model-selection/regression-model-menu/regression-model-menu.component';
import { CalculatingSpinnerModule } from 'src/app/shared/calculating-spinner/calculating-spinner.module';
import { AccountAnalysisListComponent } from './account-analysis-list/account-analysis-list.component';
import { AnalysisFooterComponent } from './analysis-footer/analysis-footer.component';
import { TableItemsDropdownModule } from 'src/app/shared/table-items-dropdown/table-items-dropdown.module';
import { RegressionModelInspectionComponent } from './run-analysis/group-analysis/regression-model-selection/regression-model-inspection/regression-model-inspection.component';
import { AnalysisItemCardComponent } from './analysis-dashboard/analysis-item-card/analysis-item-card.component';
import { EnergyDashboardComponent } from './analysis-dashboard/energy-dashboard/energy-dashboard.component';
import { WaterDashboardComponent } from './analysis-dashboard/water-dashboard/water-dashboard.component';
import { AnalysisDashboardTabsComponent } from './analysis-dashboard/analysis-dashboard-tabs/analysis-dashboard-tabs.component';
import { LabelWithTooltipModule } from 'src/app/shared/label-with-tooltip/label-with-tooltip.module';
import { SelectBankedAnalysisComponent } from './run-analysis/analysis-setup/select-banked-analysis/select-banked-analysis.component';
import { BankedGroupsDetailsComponent } from './run-analysis/analysis-setup/select-banked-analysis/banked-groups-details/banked-groups-details.component';
import { SharedReportsModule } from "../../shared/shared-reports/shared-reports.module";
import { BankedGroupAnalysisComponent } from './run-analysis/group-analysis/banked-group-analysis/banked-group-analysis.component';
import { BankedGroupResultsTableComponent } from './run-analysis/group-analysis/group-analysis-options/banked-group-results-table/banked-group-results-table.component';

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
    ModelFilterPipe,
    RegressionModelMenuComponent,
    AccountAnalysisListComponent,
    AnalysisFooterComponent,
    RegressionModelInspectionComponent,
    AnalysisItemCardComponent,
    EnergyDashboardComponent,
    WaterDashboardComponent,
    AnalysisDashboardTabsComponent,
    SelectBankedAnalysisComponent,
    BankedGroupsDetailsComponent,
    BankedGroupAnalysisComponent,
    BankedGroupResultsTableComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
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

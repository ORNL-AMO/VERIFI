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
import { HelperPipesModule } from '../../shared/helper-pipes/helper-pipes.module';
import { RegressionModelSelectionComponent } from './run-analysis/group-analysis/regression-model-selection/regression-model-selection.component';
import { MonthlyAnalysisSummaryTableComponent } from './run-analysis/group-analysis/monthly-analysis-summary/monthly-analysis-summary-table/monthly-analysis-summary-table.component';
import { AnnualAnalysisSummaryTableComponent } from './run-analysis/group-analysis/annual-analysis-summary/annual-analysis-summary-table/annual-analysis-summary-table.component';
import { AnnualAnalysisSummaryComponent } from './run-analysis/group-analysis/annual-analysis-summary/annual-analysis-summary.component';
import { AnnualAnalysisSummaryGraphComponent } from './run-analysis/group-analysis/annual-analysis-summary/annual-analysis-summary-graph/annual-analysis-summary-graph.component';
import { MonthlyAnalysisSummaryComponent } from './run-analysis/group-analysis/monthly-analysis-summary/monthly-analysis-summary.component';
import { MonthlyAnalysisSummaryGraphComponent } from './run-analysis/group-analysis/monthly-analysis-summary/monthly-analysis-summary-graph/monthly-analysis-summary-graph.component';
import { MonthlyFacilityAnalysisComponent } from './run-analysis/facility-analysis/monthly-facility-analysis/monthly-facility-analysis.component';
import { MonthlyFacilityAnalysisTableComponent } from './run-analysis/facility-analysis/monthly-facility-analysis/monthly-facility-analysis-table/monthly-facility-analysis-table.component';
import { MonthlyFacilityAnalysisGraphComponent } from './run-analysis/facility-analysis/monthly-facility-analysis/monthly-facility-analysis-graph/monthly-facility-analysis-graph.component';
import { AnnualFacilityAnalysisComponent } from './run-analysis/facility-analysis/annual-facility-analysis/annual-facility-analysis.component';
import { AnnualFacilityAnalysisGraphComponent } from './run-analysis/facility-analysis/annual-facility-analysis/annual-facility-analysis-graph/annual-facility-analysis-graph.component';
import { AnnualFacilityAnalysisTableComponent } from './run-analysis/facility-analysis/annual-facility-analysis/annual-facility-analysis-table/annual-facility-analysis-table.component';
import { MonthlyAnalysisSummaryTableFilterComponent } from './run-analysis/group-analysis/monthly-analysis-summary/monthly-analysis-summary-table-filter/monthly-analysis-summary-table-filter.component';

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
    MonthlyAnalysisSummaryTableComponent,
    AnnualAnalysisSummaryTableComponent,
    AnnualAnalysisSummaryGraphComponent,
    AnnualAnalysisSummaryComponent,
    MonthlyAnalysisSummaryComponent,
    MonthlyAnalysisSummaryGraphComponent,
    MonthlyFacilityAnalysisComponent,
    MonthlyFacilityAnalysisTableComponent,
    MonthlyFacilityAnalysisGraphComponent,
    AnnualFacilityAnalysisComponent,
    AnnualFacilityAnalysisGraphComponent,
    AnnualFacilityAnalysisTableComponent,
    MonthlyAnalysisSummaryTableFilterComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HelperPipesModule,
    NgbPaginationModule
  ]
})
export class AnalysisModule { }

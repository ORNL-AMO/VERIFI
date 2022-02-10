import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisComponent } from './analysis.component';
import { RunAnalysisComponent } from './run-analysis/run-analysis.component';
import { AnalysisBannerComponent } from './analysis-banner/analysis-banner.component';
import { AnalysisDashboardComponent } from './analysis-dashboard/analysis-dashboard.component';
import { FacilityAnalysisComponent } from './run-analysis/facility-analysis/facility-analysis.component';
import { FacilityAnalysisGraphComponent } from './run-analysis/facility-analysis/facility-analysis-graph/facility-analysis-graph.component';
import { FacilityAnalysisTableComponent } from './run-analysis/facility-analysis/facility-analysis-table/facility-analysis-table.component';
import { GroupAnalysisComponent } from './run-analysis/group-analysis/group-analysis.component';
import { GroupAnalysisOptionsComponent } from './run-analysis/group-analysis/group-analysis-options/group-analysis-options.component';
import { GroupMonthlyEnergyIntensityComponent } from './run-analysis/group-analysis/energy-intensity/group-monthly-energy-intensity/group-monthly-energy-intensity.component';
import { GroupAnnualEnergyIntensityComponent } from './run-analysis/group-analysis/energy-intensity/group-annual-energy-intensity/group-annual-energy-intensity.component';
import { AnalysisSetupComponent } from './run-analysis/analysis-setup/analysis-setup.component';
import { FormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from '../shared/helper-pipes/helper-pipes.module';
import { MonthlyAnalysisGraphComponent } from './run-analysis/group-analysis/energy-intensity/group-monthly-energy-intensity/monthly-analysis-graph/monthly-analysis-graph.component';
import { MonthlyAnalysisTableComponent } from './run-analysis/group-analysis/energy-intensity/group-monthly-energy-intensity/monthly-analysis-table/monthly-analysis-table.component';
import { AnnualEnergyIntensityGraphComponent } from './run-analysis/group-analysis/energy-intensity/group-annual-energy-intensity/annual-energy-intensity-graph/annual-energy-intensity-graph.component';
import { AnnualEnergyIntensityTableComponent } from './run-analysis/group-analysis/energy-intensity/group-annual-energy-intensity/annual-energy-intensity-table/annual-energy-intensity-table.component';
import { RegressionModelSelectionComponent } from './run-analysis/group-analysis/regression/regression-model-selection/regression-model-selection.component';
import { MonthlyRegressionAnalysisComponent } from './run-analysis/group-analysis/regression/monthly-regression-analysis/monthly-regression-analysis.component';
import { MonthlyRegressionAnalysisGraphComponent } from './run-analysis/group-analysis/regression/monthly-regression-analysis/monthly-regression-analysis-graph/monthly-regression-analysis-graph.component';
import { MonthlyAbsoluteEnergyConsumptionComponent } from './run-analysis/group-analysis/monthly-absolute-energy-consumption/monthly-absolute-energy-consumption.component';
import { MonthlyAbsoluteConsumptionGraphComponent } from './run-analysis/group-analysis/monthly-absolute-energy-consumption/monthly-absolute-consumption-graph/monthly-absolute-consumption-graph.component';
import { MonthlyAnalysisSummaryTableComponent } from './run-analysis/group-analysis/monthly-analysis-summary-table/monthly-analysis-summary-table.component';
import { AnnualAnalysisSummaryTableComponent } from './run-analysis/group-analysis/annual-analysis-summary/annual-analysis-summary-table/annual-analysis-summary-table.component';
import { AnnualAnalysisSummaryComponent } from './run-analysis/group-analysis/annual-analysis-summary/annual-analysis-summary.component';
import { AnnualAnalysisSummaryGraphComponent } from './run-analysis/group-analysis/annual-analysis-summary/annual-analysis-summary-graph/annual-analysis-summary-graph.component';
import { MonthlyModifiedEnergyIntensityComponent } from './run-analysis/group-analysis/monthly-modified-energy-intensity/monthly-modified-energy-intensity.component';
import { MonthlyModifiedEnergyIntensityGraphComponent } from './run-analysis/group-analysis/monthly-modified-energy-intensity/monthly-modified-energy-intensity-graph/monthly-modified-energy-intensity-graph.component';

@NgModule({
  declarations: [
    AnalysisComponent,
    RunAnalysisComponent,
    AnalysisBannerComponent,
    AnalysisDashboardComponent,
    FacilityAnalysisComponent,
    FacilityAnalysisGraphComponent,
    FacilityAnalysisTableComponent,
    GroupAnalysisComponent,
    GroupAnalysisOptionsComponent,
    GroupMonthlyEnergyIntensityComponent,
    GroupAnnualEnergyIntensityComponent,
    AnalysisSetupComponent,
    MonthlyAnalysisGraphComponent,
    MonthlyAnalysisTableComponent,
    AnnualEnergyIntensityGraphComponent,
    AnnualEnergyIntensityTableComponent,
    RegressionModelSelectionComponent,
    MonthlyRegressionAnalysisComponent,
    MonthlyRegressionAnalysisGraphComponent,
    MonthlyAbsoluteEnergyConsumptionComponent,
    MonthlyAbsoluteConsumptionGraphComponent,
    MonthlyAnalysisSummaryTableComponent,
    AnnualAnalysisSummaryTableComponent,
    AnnualAnalysisSummaryGraphComponent,
    AnnualAnalysisSummaryComponent,
    MonthlyModifiedEnergyIntensityComponent,
    MonthlyModifiedEnergyIntensityGraphComponent
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

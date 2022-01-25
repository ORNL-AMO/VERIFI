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
import { GroupMonthlyEnergyIntensityComponent } from './run-analysis/group-analysis/group-monthly-energy-intensity/group-monthly-energy-intensity.component';
import { GroupAnnualEnergyIntensityComponent } from './run-analysis/group-analysis/group-annual-energy-intensity/group-annual-energy-intensity.component';
import { AnalysisSetupComponent } from './run-analysis/analysis-setup/analysis-setup.component';

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
    AnalysisSetupComponent
  ],
  imports: [
    CommonModule
  ]
})
export class AnalysisModule { }

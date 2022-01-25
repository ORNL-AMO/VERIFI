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
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from '../shared/helper-pipes/helper-pipes.module';
import { MonthlyAnalysisGraphComponent } from './run-analysis/group-analysis/group-monthly-energy-intensity/monthly-analysis-graph/monthly-analysis-graph.component';
import { MonthlyAnalysisTableComponent } from './run-analysis/group-analysis/group-monthly-energy-intensity/monthly-analysis-table/monthly-analysis-table.component';
import { AnnualEnergyIntensityGraphComponent } from './run-analysis/group-analysis/group-annual-energy-intensity/annual-energy-intensity-graph/annual-energy-intensity-graph.component';
import { AnnualEnergyIntensityTableComponent } from './run-analysis/group-analysis/group-annual-energy-intensity/annual-energy-intensity-table/annual-energy-intensity-table.component';

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
    AnnualEnergyIntensityTableComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    RouterModule,
    HelperPipesModule
  ]
})
export class AnalysisModule { }

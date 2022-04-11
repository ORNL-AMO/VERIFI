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
import { AnnualAnalysisSummaryComponent } from './run-analysis/group-analysis/annual-analysis-summary/annual-analysis-summary.component';
import { MonthlyAnalysisSummaryComponent } from './run-analysis/group-analysis/monthly-analysis-summary/monthly-analysis-summary.component';
import { MonthlyFacilityAnalysisComponent } from './run-analysis/facility-analysis/monthly-facility-analysis/monthly-facility-analysis.component';
import { AnnualFacilityAnalysisComponent } from './run-analysis/facility-analysis/annual-facility-analysis/annual-facility-analysis.component';
import { SharedAnalysisModule } from 'src/app/shared/shared-analysis/shared-analysis.module';



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
    AnnualFacilityAnalysisComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HelperPipesModule,
    NgbPaginationModule,
    SharedAnalysisModule
  ]
})
export class AnalysisModule { }

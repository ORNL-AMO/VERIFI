import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityAnalysisReportComponent } from './facility-analysis-report/facility-analysis-report.component';
import { CalculatingSpinnerModule } from '../calculating-spinner/calculating-spinner.module';
import { SharedAnalysisModule } from '../shared-analysis/shared-analysis.module';
import { AnnualFacilityAnalysisReportComponent } from './facility-analysis-report/annual-facility-analysis-report/annual-facility-analysis-report.component';
import { MonthlyFacilityAnalysisReportComponent } from './facility-analysis-report/monthly-facility-analysis-report/monthly-facility-analysis-report.component';
import { GroupAnalysisReportComponent } from './facility-analysis-report/group-analysis-report/group-analysis-report.component';
import { HelperPipesModule } from '../helper-pipes/helper-pipes.module';
import { RegressionModelDetailsComponent } from './facility-analysis-report/group-analysis-report/regression-model-details/regression-model-details.component';



@NgModule({
  declarations: [
    FacilityAnalysisReportComponent,
    AnnualFacilityAnalysisReportComponent,
    MonthlyFacilityAnalysisReportComponent,
    GroupAnalysisReportComponent,
    RegressionModelDetailsComponent
  ],
  imports: [
    CommonModule,
    CalculatingSpinnerModule,
    SharedAnalysisModule,
    HelperPipesModule
  ],
  exports: [
    FacilityAnalysisReportComponent
  ]
})
export class SharedReportsModule { }

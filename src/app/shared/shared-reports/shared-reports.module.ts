import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityAnalysisReportComponent } from './facility-analysis-report/facility-analysis-report.component';
import { CalculatingSpinnerModule } from '../calculating-spinner/calculating-spinner.module';
import { SharedAnalysisModule } from '../shared-analysis/shared-analysis.module';
import { AnnualFacilityAnalysisReportComponent } from './facility-analysis-report/annual-facility-analysis-report/annual-facility-analysis-report.component';
import { MonthlyFacilityAnalysisReportComponent } from './facility-analysis-report/monthly-facility-analysis-report/monthly-facility-analysis-report.component';
import { GroupAnalysisReportComponent } from './facility-analysis-report/group-analysis-report/group-analysis-report.component';
import { HelperPipesModule } from '../helper-pipes/_helper-pipes.module';
import { RegressionModelDetailsComponent } from './facility-analysis-report/group-analysis-report/regression-model-details/regression-model-details.component';
import { IncludeTablePipe } from './include-table.pipe';
import { GroupAnnualAnalysisReportComponent } from './facility-analysis-report/group-analysis-report/group-annual-analysis-report/group-annual-analysis-report.component';
import { GroupMonthlyAnalysisReportComponent } from './facility-analysis-report/group-analysis-report/group-monthly-analysis-report/group-monthly-analysis-report.component';
import { BreakUpTableForPrintPipe } from './break-up-table-for-print.pipe';



@NgModule({
  declarations: [
    FacilityAnalysisReportComponent,
    AnnualFacilityAnalysisReportComponent,
    MonthlyFacilityAnalysisReportComponent,
    GroupAnalysisReportComponent,
    RegressionModelDetailsComponent,
    IncludeTablePipe,
    GroupAnnualAnalysisReportComponent,
    GroupMonthlyAnalysisReportComponent,
    BreakUpTableForPrintPipe
  ],
  imports: [
    CommonModule,
    CalculatingSpinnerModule,
    SharedAnalysisModule,
    HelperPipesModule
  ],
  exports: [
    FacilityAnalysisReportComponent,
    GroupAnalysisReportComponent
  ]
})
export class SharedReportsModule { }

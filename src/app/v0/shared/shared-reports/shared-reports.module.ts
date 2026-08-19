import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FacilityAnalysisReportComponent } from '@v0/shared/shared-reports/facility-analysis-report/facility-analysis-report.component';
import { CalculatingSpinnerModule } from '@shared/calculating-spinner/calculating-spinner.module';
import { SharedAnalysisModule } from '@shared/shared-analysis/shared-analysis.module';
import { AnnualFacilityAnalysisReportComponent } from '@v0/shared/shared-reports/facility-analysis-report/annual-facility-analysis-report/annual-facility-analysis-report.component';
import { MonthlyFacilityAnalysisReportComponent } from '@v0/shared/shared-reports/facility-analysis-report/monthly-facility-analysis-report/monthly-facility-analysis-report.component';
import { GroupAnalysisReportComponent } from '@v0/shared/shared-reports/facility-analysis-report/group-analysis-report/group-analysis-report.component';
import { HelperPipesModule } from '@shared/helper-pipes/_helper-pipes.module';
import { RegressionModelDetailsComponent } from '@v0/shared/shared-reports/facility-analysis-report/group-analysis-report/regression-model-details/regression-model-details.component';
import { IncludeTablePipe } from '@v0/shared/shared-reports/include-table.pipe';
import { GroupAnnualAnalysisReportComponent } from '@v0/shared/shared-reports/facility-analysis-report/group-analysis-report/group-annual-analysis-report/group-annual-analysis-report.component';
import { GroupMonthlyAnalysisReportComponent } from '@v0/shared/shared-reports/facility-analysis-report/group-analysis-report/group-monthly-analysis-report/group-monthly-analysis-report.component';
import { BreakUpTableForPrintPipe } from '@v0/shared/shared-reports/break-up-table-for-print.pipe';
import { RollingEnergyConsumptionGraphComponent } from '@v0/shared/shared-reports/facility-savings-report/rolling-energy-consumption-graph/rolling-energy-consumption-graph.component';
import { RollingEnergySavingsGraphComponent } from '@v0/shared/shared-reports/facility-savings-report/rolling-energy-savings-graph/rolling-energy-savings-graph.component';



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
    BreakUpTableForPrintPipe,
    RollingEnergyConsumptionGraphComponent,
    RollingEnergySavingsGraphComponent
  ],
  imports: [
    CommonModule,
    CalculatingSpinnerModule,
    SharedAnalysisModule,
    HelperPipesModule
  ],
  exports: [
    FacilityAnalysisReportComponent,
    GroupAnalysisReportComponent,
    RollingEnergyConsumptionGraphComponent,
    RollingEnergySavingsGraphComponent,
    IncludeTablePipe,
    BreakUpTableForPrintPipe
  ]
})
export class SharedReportsModule { }

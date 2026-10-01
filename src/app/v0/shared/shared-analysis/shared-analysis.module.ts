import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisSummaryTableFilterComponent } from '@v0/shared/shared-analysis/analysis-summary-table-filter/analysis-summary-table-filter.component';
import { AnnualAnalysisSummaryTableComponent } from '@v0/shared/shared-analysis/annual-analysis-summary-table/annual-analysis-summary-table.component';
import { MonthlyAnalysisSummaryTableComponent } from '@v0/shared/shared-analysis/monthly-analysis-summary-table/monthly-analysis-summary-table.component';
import { FormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { HelperPipesModule } from '@v0/shared/helper-pipes/_helper-pipes.module';
import { AnnualAnalysisSummaryGraphComponent } from '@v0/shared/shared-analysis/annual-analysis-summary-graph/annual-analysis-summary-graph.component';
import { MonthlyAnalysisSummaryGraphComponent } from '@v0/shared/shared-analysis/monthly-analysis-summary-graph/monthly-analysis-summary-graph.component';
import { MonthlyAnalysisSummarySavingsGraphComponent } from '@v0/shared/shared-analysis/monthly-analysis-summary-savings-graph/monthly-analysis-summary-savings-graph.component';
import { AnnualAnalysisGroupSavingsTableComponent } from '@v0/shared/shared-analysis/annual-analysis-group-savings-table/annual-analysis-group-savings-table.component';
import { AnnualAnalysisGroupSavingsGraphComponent } from '@v0/shared/shared-analysis/annual-analysis-group-savings-graph/annual-analysis-group-savings-graph.component';
import { AnalysisDataValidationTablesComponent } from '@v0/shared/shared-analysis/data-check/analysis-data-validation-tables/analysis-data-validation-tables.component';
import { AnalysisFacilityReportComponent } from '@v0/shared/shared-analysis/data-check/analysis-facility-report/analysis-facility-report.component';
import { AnalysisProblemsInformationComponent } from '@v0/shared/shared-analysis/data-check/analysis-problems-information/analysis-problems-information.component';
import { RegressionModelDetailsTable } from '@v0/shared/shared-analysis/data-check/regression-model-details-table/regression-model-details-table.component';
import { UserDefineModelDateRangePipe } from '@v0/shared/shared-analysis/data-check/regression-model-details-table/user-define-model-date-range.pipe';
import { CalculatedReportYearWarningComponent } from '@v0/shared/shared-analysis/calculated-report-year-warning/calculated-report-year-warning.component';
import { RouterModule } from '@angular/router';


@NgModule({
  declarations: [
    AnalysisSummaryTableFilterComponent,
    AnnualAnalysisSummaryTableComponent,
    MonthlyAnalysisSummaryTableComponent,
    AnnualAnalysisSummaryGraphComponent,
    MonthlyAnalysisSummaryGraphComponent,
    MonthlyAnalysisSummarySavingsGraphComponent,
    AnnualAnalysisGroupSavingsTableComponent,
    AnnualAnalysisGroupSavingsGraphComponent,
    AnalysisDataValidationTablesComponent,
    AnalysisFacilityReportComponent,
    AnalysisProblemsInformationComponent,
    RegressionModelDetailsTable,
    UserDefineModelDateRangePipe,
    CalculatedReportYearWarningComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgbPaginationModule,
    HelperPipesModule,
    RouterModule
  ],
  exports: [
    AnalysisSummaryTableFilterComponent,
    AnnualAnalysisSummaryTableComponent,
    MonthlyAnalysisSummaryTableComponent,
    AnnualAnalysisSummaryGraphComponent,
    MonthlyAnalysisSummaryGraphComponent,
    MonthlyAnalysisSummarySavingsGraphComponent,
    AnnualAnalysisGroupSavingsTableComponent,
    AnnualAnalysisGroupSavingsGraphComponent,
    AnalysisDataValidationTablesComponent,
    AnalysisFacilityReportComponent,
    AnalysisProblemsInformationComponent,
    CalculatedReportYearWarningComponent
  ]
})
export class SharedAnalysisModule { }

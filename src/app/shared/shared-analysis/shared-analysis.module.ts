import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisSummaryTableFilterComponent } from './analysis-summary-table-filter/analysis-summary-table-filter.component';
import { AnnualAnalysisSummaryTableComponent } from './annual-analysis-summary-table/annual-analysis-summary-table.component';
import { MonthlyAnalysisSummaryTableComponent } from './monthly-analysis-summary-table/monthly-analysis-summary-table.component';
import { FormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { HelperPipesModule } from '../helper-pipes/_helper-pipes.module';
import { AnnualAnalysisSummaryGraphComponent } from './annual-analysis-summary-graph/annual-analysis-summary-graph.component';
import { MonthlyAnalysisSummaryGraphComponent } from './monthly-analysis-summary-graph/monthly-analysis-summary-graph.component';
import { MonthlyAnalysisSummarySavingsGraphComponent } from './monthly-analysis-summary-savings-graph/monthly-analysis-summary-savings-graph.component';
import { AnnualAnalysisGroupSavingsTableComponent } from './annual-analysis-group-savings-table/annual-analysis-group-savings-table.component';
import { AnnualAnalysisGroupSavingsGraphComponent } from './annual-analysis-group-savings-graph/annual-analysis-group-savings-graph.component';
import { AnalysisDataValidationTablesComponent } from './data-check/analysis-data-validation-tables/analysis-data-validation-tables.component';
import { AnalysisFacilityReportComponent } from './data-check/analysis-facility-report/analysis-facility-report.component';
import { AnalysisProblemsInformationComponent } from './data-check/analysis-problems-information/analysis-problems-information.component';


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
    AnalysisProblemsInformationComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgbPaginationModule,
    HelperPipesModule
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
    AnalysisProblemsInformationComponent
  ]
})
export class SharedAnalysisModule { }

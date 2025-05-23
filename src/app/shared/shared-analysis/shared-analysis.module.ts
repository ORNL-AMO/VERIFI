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


@NgModule({
  declarations: [
    AnalysisSummaryTableFilterComponent,
    AnnualAnalysisSummaryTableComponent,
    MonthlyAnalysisSummaryTableComponent,
    AnnualAnalysisSummaryGraphComponent,
    MonthlyAnalysisSummaryGraphComponent,
    MonthlyAnalysisSummarySavingsGraphComponent
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
    MonthlyAnalysisSummarySavingsGraphComponent
  ]
})
export class SharedAnalysisModule { }

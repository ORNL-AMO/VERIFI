import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisSummaryTableFilterComponent } from './analysis-summary-table-filter/analysis-summary-table-filter.component';
import { AnnualAnalysisSummaryTableComponent } from './annual-analysis-summary-table/annual-analysis-summary-table.component';
import { MonthlyAnalysisSummaryTableComponent } from './monthly-analysis-summary-table/monthly-analysis-summary-table.component';
import { FormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { HelperPipesModule } from '../helper-pipes/helper-pipes.module';


@NgModule({
  declarations: [
    AnalysisSummaryTableFilterComponent,
    AnnualAnalysisSummaryTableComponent,
    MonthlyAnalysisSummaryTableComponent
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
    MonthlyAnalysisSummaryTableComponent
  ]
})
export class SharedAnalysisModule { }

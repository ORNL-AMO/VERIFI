import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AnalysisResultNumberPipe } from '../number/analysis-result-number.pipe';
import { AnalysisResultMarkersComponent } from '../result-markers/analysis-result-markers/analysis-result-markers.component';
import { AnalysisResultsTableComponent } from './analysis-results-table.component';

@NgModule({ declarations: [AnalysisResultsTableComponent], imports: [CommonModule, AnalysisResultNumberPipe, AnalysisResultMarkersComponent],
  exports: [AnalysisResultsTableComponent] })
export class AnalysisResultsTableModule { }

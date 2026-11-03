import { Component, computed, input } from '@angular/core';
import { AnalysisGroup, AnalysisTableColumns, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbFacility } from '@data/models/idbModels/facility';
import { FacilityAnalysisGroupCalculationResult } from '@platform/web-workers/facility-analysis-results-worker.contract';
import { analysisReportTable } from '../analysis-report.view';
@Component({ selector: 'app-analysis-report-results-table', standalone: false, templateUrl: './analysis-report-results-table.component.html', styleUrls: ['./analysis-report-results-table.component.css'] })
export class AnalysisReportResultsTableComponent {
  readonly annual = input<readonly AnnualAnalysisSummary[]>([]);
  readonly monthly = input<readonly MonthlyAnalysisSummaryData[]>([]);
  readonly columns = input.required<AnalysisTableColumns>();
  readonly period = input.required<'annual' | 'monthly'>();
  readonly caption = input.required<string>();
  readonly unit = input.required<string>();
  readonly facility = input.required<IdbFacility>();
  readonly category = input<'energy' | 'water'>('energy');
  readonly banking = input(false);
  readonly baseline = input(false);
  readonly group = input<AnalysisGroup>();
  readonly groups = input<readonly FacilityAnalysisGroupCalculationResult[]>([]);
  readonly view = computed(() => analysisReportTable(this.annual(), this.monthly(), this.columns(), this.period(), this.unit(), this.facility(), this.banking(), this.group(), this.groups(), this.baseline()));
}

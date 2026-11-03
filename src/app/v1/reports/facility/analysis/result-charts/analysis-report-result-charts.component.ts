import { Component, computed, input } from '@angular/core';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { FacilityAnalysisGroupCalculationResult } from '@platform/web-workers/facility-analysis-results-worker.contract';
import { annualResultChartsView, monthlyResultChartsView, facilityAnnualChartRows, facilityMonthlyChartRows } from '@app/v1/shared/analysis-results/chart/analysis-result-chart.view';

@Component({ selector: 'app-analysis-report-result-charts', standalone: false, templateUrl: './analysis-report-result-charts.component.html', styleUrls: ['./analysis-report-result-charts.component.css'] })
export class AnalysisReportResultChartsComponent {
  readonly annual = input<readonly AnnualAnalysisSummary[]>([]);
  readonly monthly = input<readonly MonthlyAnalysisSummaryData[]>([]);
  readonly period = input.required<'annual' | 'monthly'>();
  readonly unit = input.required<string>();
  readonly category = input.required<'energy' | 'water'>();
  readonly scope = input<'facility' | 'group'>('facility');
  readonly groups = input<readonly FacilityAnalysisGroupCalculationResult[]>([]);
  readonly charts = computed(() => {
    if (this.period() === 'annual') {
      const rows = this.scope() === 'facility' ? facilityAnnualChartRows(this.annual(), this.groups()) : this.annual();
      return annualResultChartsView(rows, this.category(), this.unit());
    }
    const rows = this.scope() === 'facility' ? facilityMonthlyChartRows(this.monthly(), this.groups()) : this.monthly();
    return monthlyResultChartsView(rows, this.monthly(), this.category(), this.unit(), this.scope() === 'group' && this.monthly().some(row => row.isBanked));
  });
}

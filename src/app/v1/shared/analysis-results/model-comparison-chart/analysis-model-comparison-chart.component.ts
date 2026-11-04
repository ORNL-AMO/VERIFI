import { Component, computed, input } from '@angular/core';
import { formatRegressionNumber } from '../number/regression-number-format';
import { AnalysisModelComparisonData, analysisModelComparisonChart, analysisModelComparisonPeriod, analysisModelMonthKey } from './analysis-model-comparison-chart.view';

@Component({ selector: 'app-analysis-model-comparison-chart', standalone: false,
  templateUrl: './analysis-model-comparison-chart.component.html', styleUrls: ['./analysis-model-comparison-chart.component.css'] })
export class AnalysisModelComparisonChartComponent {
  readonly data = input.required<AnalysisModelComparisonData>();
  readonly deferUntilVisible = input(false);
  readonly option = computed(() => analysisModelComparisonChart(this.data()));
  readonly accessibleRows = computed(() => {
    const data = this.data(), period = analysisModelComparisonPeriod(data);
    const comparison = data.comparison ? new Map(data.comparison.monthly.map(row => [analysisModelMonthKey(row.date), row.modeledEnergy])) : undefined;
    return data.monthly.map((row, index) => ({ key: new Date(row.date).getTime(),
      label: new Date(row.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      actual: formatRegressionNumber(row.energyUse, '—'), modeled: formatRegressionNumber(row.modeledEnergy, '—'),
      selected: comparison ? formatRegressionNumber(comparison.get(analysisModelMonthKey(row.date)), '—') : undefined,
      model: !!period && index >= period.start && index <= period.end }));
  });
}

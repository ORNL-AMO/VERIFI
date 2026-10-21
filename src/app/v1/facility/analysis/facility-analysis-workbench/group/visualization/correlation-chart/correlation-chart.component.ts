import { Component, ViewChild, computed, input } from '@angular/core';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { correlationOption, formatRawVisualizationValue } from '../group-visualization-charts';
import type { CorrelationSummary, VisualizationPredictor } from '../group-visualization.models';

@Component({
  selector: 'app-correlation-chart',
  standalone: true,
  imports: [EChartsChartDirective, IconComponent],
  templateUrl: './correlation-chart.component.html',
  styleUrl: './correlation-chart.component.css'
})
export class CorrelationChartComponent {
  @ViewChild(EChartsChartDirective) private chart?: EChartsChartDirective;
  readonly predictor = input.required<VisualizationPredictor>();
  readonly summary = input.required<CorrelationSummary>();
  readonly usageLabel = input.required<string>();
  readonly option = computed(() => correlationOption(this.predictor(), this.summary(), this.usageLabel()));
  readonly statistics = computed(() => {
    const summary = this.summary();
    const format = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 3 });
    return summary.r == null ? undefined : `r = ${format(summary.r)} · R² = ${format(summary.rSquared)}`;
  });
  readonly equation = computed(() => {
    const { slope, intercept } = this.summary();
    if (slope == null || intercept == null || !Number.isFinite(slope) || !Number.isFinite(intercept)) return undefined;
    return `y = ${formatRawVisualizationValue(slope)}x ${intercept < 0 ? '−' : '+'} ${formatRawVisualizationValue(Math.abs(intercept))}`;
  });

  download(): void {
    this.chart?.downloadPng(`${this.predictor().name}-correlation`);
  }
}

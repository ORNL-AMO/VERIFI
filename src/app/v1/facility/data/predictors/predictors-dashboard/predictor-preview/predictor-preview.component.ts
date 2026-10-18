import { Component, computed, input, output } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { V1EChartsDataZoomRange } from '@app/v1/shared/charts/echarts-chart.directive';
import { MeterResultsChartRow } from '@app/v1/shared/charts/metric-results-chart.models';
import { PredictorInventoryEntry } from '../../predictor-inventory/predictor-inventory.models';

@Component({ selector: 'app-predictor-preview', standalone: true, imports: [IconComponent, MeterResultsChartComponent],
  templateUrl: './predictor-preview.component.html', styleUrls: ['./predictor-preview.component.css'] })
export class PredictorPreviewComponent {
  readonly entry = input<PredictorInventoryEntry>();
  readonly rows = input.required<readonly MeterResultsChartRow[]>();
  readonly zoom = input<V1EChartsDataZoomRange>({ start: 0, end: 100 });
  readonly zoomChanged = output<V1EChartsDataZoomRange>();
  readonly metrics = computed(() => [{ id: 'value', label: this.entry()?.card.predictor.name ?? 'Predictor', unit: this.entry()?.card.predictor.unit, color: 'var(--v1-chart-series-3)' }]);
  readonly coverage = computed(() => {
    const rows = this.rows(); return rows.length ? `${rows[0].periodLabel} – ${rows[rows.length - 1].periodLabel}` : 'No monthly data';
  });
  changeZoom(factor: number): void {
    const current = this.zoom(), width = Math.max(10, Math.min(100, (current.end - current.start) * factor));
    const start = Math.max(0, Math.min(100 - width, (current.start + current.end - width) / 2));
    this.zoomChanged.emit({ start, end: start + width });
  }
}

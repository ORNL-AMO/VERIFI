import { Component, Input, OnChanges, computed, signal } from '@angular/core';
import type { V1EChartsDataZoomRange } from '@app/v1/shared/charts/echarts-chart.directive';
import type { TimeSeriesModel } from '../time-series.models';
import { timeSeriesOption } from '../time-series-options';

@Component({ selector: 'app-visualization-time-series', standalone: false,
  templateUrl: './time-series-chart.component.html', styleUrls: ['./time-series-chart.component.css'] })
export class TimeSeriesChartComponent implements OnChanges {
  @Input({ required: true }) model!: TimeSeriesModel;
  private readonly modelValue = signal<TimeSeriesModel | undefined>(undefined);
  readonly zoom = signal<V1EChartsDataZoomRange>({ start: 0, end: 100 });
  readonly option = computed(() => { const model = this.modelValue(); return model ? timeSeriesOption(model, this.zoom()) : undefined; });
  ngOnChanges(): void { this.modelValue.set(this.model); }
  updateZoom(range: V1EChartsDataZoomRange): void {
    if (Number.isFinite(range.start) && Number.isFinite(range.end)) this.zoom.set({ start: Math.max(0, Math.min(100, range.start)), end: Math.max(0, Math.min(100, range.end)) });
  }
  resetZoom(): void { this.zoom.set({ start: 0, end: 100 }); }
}

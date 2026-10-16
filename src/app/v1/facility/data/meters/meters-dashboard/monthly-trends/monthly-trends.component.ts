import { Component, input, output } from '@angular/core';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { V1EChartsDataZoomRange } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { MonthlyTrendView } from '../meters-dashboard.view';

@Component({
  selector: 'app-monthly-trends', standalone: true,
  imports: [MeterResultsChartComponent, IconComponent],
  templateUrl: './monthly-trends.component.html', styleUrls: ['./monthly-trends.component.css']
})
export class MonthlyTrendsComponent {
  readonly charts = input.required<readonly MonthlyTrendView[]>();
  readonly state = input<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly zoomRange = input<V1EChartsDataZoomRange>({ start: 0, end: 100 });
  readonly emphasized = input<string | undefined>();
  readonly zoomChanged = output<V1EChartsDataZoomRange>();
  zoom(factor: number): void {
    const current = this.zoomRange();
    const width = Math.max(10, Math.min(100, (current.end - current.start) * factor));
    const start = Math.max(0, Math.min(100 - width, (current.start + current.end - width) / 2));
    this.zoomChanged.emit({ start, end: start + width });
  }
}

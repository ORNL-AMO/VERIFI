import { AfterViewInit, Directive, ElementRef, Input, NgZone, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import * as echarts from 'echarts/core';
import { BarChart, BarSeriesOption, LineChart, LineSeriesOption } from 'echarts/charts';
import {
  DatasetComponent,
  DatasetComponentOption,
  GridComponent,
  GridComponentOption,
  LegendComponent,
  LegendComponentOption,
  TooltipComponent,
  TooltipComponentOption,
  TransformComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ECharts } from 'echarts/core';

echarts.use([
  BarChart,
  LineChart,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TransformComponent,
  CanvasRenderer
]);

export type V1EChartsOption = echarts.ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | DatasetComponentOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
>;

@Directive({
  selector: '[appV1ECharts]',
  standalone: true
})
export class EChartsChartDirective implements AfterViewInit, OnChanges, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private chart: ECharts | undefined;
  private resizeObserver: ResizeObserver | undefined;

  @Input('appV1ECharts') option: V1EChartsOption | undefined;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.chart = echarts.init(this.elementRef.nativeElement, undefined, { renderer: 'canvas' });
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
        this.resizeObserver.observe(this.elementRef.nativeElement);
      }
      this.applyOption();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['option']) {
      this.applyOption();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  private applyOption(): void {
    if (!this.chart || !this.option) {
      return;
    }
    this.zone.runOutsideAngular(() => this.chart?.setOption(this.option, true));
  }
}

import { AfterViewInit, Directive, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import * as echarts from 'echarts/core';
import { BarChart, BarSeriesOption, LineChart, LineSeriesOption, ScatterChart, ScatterSeriesOption } from 'echarts/charts';
import {
  DataZoomComponent,
  DataZoomComponentOption,
  DatasetComponent,
  DatasetComponentOption,
  GridComponent,
  GridComponentOption,
  LegendComponent,
  LegendComponentOption,
  MarkAreaComponent,
  MarkAreaComponentOption,
  ToolboxComponent,
  ToolboxComponentOption,
  TooltipComponent,
  TooltipComponentOption,
  TransformComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ECharts } from 'echarts/core';

echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  DataZoomComponent,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  ToolboxComponent,
  TooltipComponent,
  TransformComponent,
  CanvasRenderer
]);

export type V1EChartsOption = echarts.ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | ScatterSeriesOption
  | DataZoomComponentOption
  | DatasetComponentOption
  | GridComponentOption
  | LegendComponentOption
  | MarkAreaComponentOption
  | ToolboxComponentOption
  | TooltipComponentOption
>;

export interface V1EChartsDataZoomRange {
  readonly start: number;
  readonly end: number;
}

export interface V1EChartsPointClickEvent {
  readonly componentType?: string;
  readonly seriesIndex?: number;
  readonly dataIndex?: number;
  readonly name?: string;
  readonly value?: unknown;
  readonly data?: unknown;
}

@Directive({
  selector: '[appV1ECharts]',
  standalone: true
})
export class EChartsChartDirective implements AfterViewInit, OnChanges, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private chart: ECharts | undefined;
  private resizeObserver: ResizeObserver | undefined;
  private themeObserver: MutationObserver | undefined;
  private initialRenderFrame: number | undefined;
  private hasRenderedOption = false;

  @Input('appV1ECharts') option: V1EChartsOption | undefined;
  @Output() dataZoomChanged = new EventEmitter<V1EChartsDataZoomRange>();
  @Output() chartPointClicked = new EventEmitter<V1EChartsPointClickEvent>();

  downloadPng(fileName: string): void {
    if (!this.chart || typeof document === 'undefined') {
      return;
    }
    const imageUrl = this.chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      excludeComponents: ['toolbox', 'dataZoom']
    });
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = v1ChartPngFileName(fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.chart = echarts.init(this.elementRef.nativeElement, undefined, { renderer: 'canvas' });
      this.bindDataZoomEvent();
      this.bindPointClickEvent();
      this.observeThemeChanges();
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
    if (this.initialRenderFrame !== undefined && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.initialRenderFrame);
    }
    this.themeObserver?.disconnect();
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  private applyOption(): void {
    if (!this.chart || !this.option) {
      return;
    }

    if (!this.hasRenderedOption && typeof requestAnimationFrame !== 'undefined') {
      if (this.initialRenderFrame !== undefined) {
        cancelAnimationFrame(this.initialRenderFrame);
      }
      this.initialRenderFrame = requestAnimationFrame(() => {
        this.initialRenderFrame = undefined;
        this.zone.runOutsideAngular(() => this.applyOptionNow());
      });
      return;
    }

    this.zone.runOutsideAngular(() => this.applyOptionNow());
  }

  private applyOptionNow(): void {
    if (!this.chart || !this.option) {
      return;
    }

    const isInitialRender = !this.hasRenderedOption;
    const option = this.withThemeDefaults(this.option, isInitialRender);
    this.chart.setOption(option, {
      lazyUpdate: false,
      replaceMerge: isInitialRender ? undefined : ['series', 'xAxis', 'yAxis', 'grid', 'dataZoom']
    });
    this.hasRenderedOption = true;
  }

  private observeThemeChanges(): void {
    if (typeof MutationObserver === 'undefined') {
      return;
    }
    const themeRoot = this.elementRef.nativeElement.closest('.v1-root');
    if (!themeRoot) {
      return;
    }
    this.themeObserver = new MutationObserver(() => this.applyOption());
    this.themeObserver.observe(themeRoot, { attributes: true, attributeFilter: ['class', 'style'] });
  }

  private withThemeDefaults(option: V1EChartsOption, isInitialRender: boolean): V1EChartsOption {
    const styles = getComputedStyle(this.elementRef.nativeElement);
    const theme = this.readChartTheme(styles);
    const optionRecord = option as Record<string, unknown>;
    const themedOption: Record<string, unknown> = {
      ...optionRecord,
      animation: optionRecord['animation'] ?? true,
      animationDuration: optionRecord['animationDuration'] ?? (isInitialRender ? 900 : 300),
      animationDurationUpdate: optionRecord['animationDurationUpdate'] ?? 300,
      animationEasing: optionRecord['animationEasing'] ?? 'cubicOut',
      animationEasingUpdate: optionRecord['animationEasingUpdate'] ?? 'cubicOut',
      backgroundColor: optionRecord['backgroundColor'] ?? 'transparent',
      color: optionRecord['color'] ?? theme.series,
      textStyle: mergePlain({ color: theme.text, fontFamily: 'Arial, Helvetica, sans-serif' }, optionRecord['textStyle']),
      tooltip: mergePlain({
        backgroundColor: theme.surface,
        borderColor: theme.border,
        textStyle: { color: theme.text },
        axisPointer: {
          lineStyle: { color: theme.annotation },
          crossStyle: { color: theme.annotation }
        }
      }, optionRecord['tooltip']),
      legend: mergePlain({ textStyle: { color: theme.muted } }, optionRecord['legend'])
    };

    themedOption['toolbox'] = mergePlain(defaultToolbox(theme), optionRecord['toolbox']);

    if ('xAxis' in optionRecord) {
      themedOption['xAxis'] = themeAxis(optionRecord['xAxis'], theme);
    }
    if ('yAxis' in optionRecord) {
      themedOption['yAxis'] = themeAxis(optionRecord['yAxis'], theme);
    }

    return resolveCssVariableReferences(themedOption, styles) as V1EChartsOption;
  }

  private readChartTheme(styles: CSSStyleDeclaration): V1ChartTheme {
    const text = cssVar(styles, '--v1-text', '#17231f');
    const muted = cssVar(styles, '--v1-muted', '#5f6f68');
    const border = cssVar(styles, '--v1-border', '#d7dfda');
    return {
      text,
      muted,
      border,
      surface: cssVar(styles, '--v1-surface', '#ffffff'),
      grid: cssVar(styles, '--v1-chart-grid', border),
      annotation: cssVar(styles, '--v1-chart-annotation', muted),
      series: [
        cssVar(styles, '--v1-chart-series-1', '#f26a21'),
        cssVar(styles, '--v1-chart-series-2', '#1d8f5c'),
        cssVar(styles, '--v1-chart-series-3', '#4156a6'),
        cssVar(styles, '--v1-chart-series-4', '#b87816')
      ]
    };
  }

  private bindDataZoomEvent(): void {
    this.chart?.on('datazoom', event => {
      const range = dataZoomRangeFromEvent(event);
      if (range) {
        this.zone.run(() => this.dataZoomChanged.emit(range));
      }
    });
  }

  private bindPointClickEvent(): void {
    this.chart?.on('click', event => {
      if (event.componentType !== 'series') return;
      this.zone.run(() => this.chartPointClicked.emit({
        componentType: event.componentType,
        seriesIndex: event.seriesIndex,
        dataIndex: event.dataIndex,
        name: event.name,
        value: event.value,
        data: event.data
      }));
    });
  }
}

interface V1ChartTheme {
  text: string;
  muted: string;
  border: string;
  surface: string;
  grid: string;
  annotation: string;
  series: string[];
}

function cssVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  return styles.getPropertyValue(name).trim() || fallback;
}

function mergePlain(defaults: Record<string, unknown>, value: unknown): Record<string, unknown> {
  if (!isPlainRecord(value)) {
    return defaults;
  }
  return deepMerge(defaults, value);
}

function deepMerge(defaults: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    const defaultValue = merged[key];
    merged[key] = isPlainRecord(defaultValue) && isPlainRecord(value)
      ? deepMerge(defaultValue, value)
      : value;
  }
  return merged;
}

function themeAxis(axis: unknown, theme: V1ChartTheme): unknown {
  if (Array.isArray(axis)) {
    return axis.map(item => themeAxisItem(item, theme));
  }
  return themeAxisItem(axis, theme);
}

function themeAxisItem(axis: unknown, theme: V1ChartTheme): Record<string, unknown> {
  const axisRecord = isPlainRecord(axis) ? axis : {};
  return deepMerge({
    axisLabel: { color: theme.muted },
    axisLine: { lineStyle: { color: theme.border } },
    axisTick: { lineStyle: { color: theme.border } },
    nameTextStyle: { color: theme.muted },
    splitLine: { lineStyle: { color: theme.grid } },
    splitArea: { areaStyle: { color: ['transparent'] } }
  }, axisRecord);
}

function defaultToolbox(theme: V1ChartTheme): Record<string, unknown> {
  return {
    show: false,
    iconStyle: {
      borderColor: theme.muted
    }
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveCssVariableReferences(value: unknown, styles: CSSStyleDeclaration): unknown {
  if (typeof value === 'string') {
    const cssVariable = /^var\((--[\w-]+)(?:,\s*([^)]+))?\)$/.exec(value.trim());
    if (cssVariable) {
      return cssVar(styles, cssVariable[1], cssVariable[2]?.trim() ?? value);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => resolveCssVariableReferences(item, styles));
  }

  if (isPlainRecord(value)) {
    const resolved: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      resolved[key] = resolveCssVariableReferences(item, styles);
    }
    return resolved;
  }

  return value;
}

function dataZoomRangeFromEvent(event: unknown): V1EChartsDataZoomRange | undefined {
  const eventRecord = isPlainRecord(event) ? event : {};
  const batch = Array.isArray(eventRecord['batch'])
    ? eventRecord['batch'].find(isPlainRecord)
    : undefined;
  const source = batch ?? eventRecord;
  const start = Number(source['start']);
  const end = Number(source['end']);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return undefined;
  }
  return { start, end };
}

export function v1ChartPngFileName(fileName: string): string {
  const baseName = fileName.trim().replace(/\.png$/i, '');
  const safeName = baseName.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'chart';
  return `${safeName}.png`;
}

import { AfterViewInit, Directive, ElementRef, Input, NgZone, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import * as echarts from 'echarts/core';
import { BarChart, BarSeriesOption, LineChart, LineSeriesOption } from 'echarts/charts';
import {
  DataZoomComponent,
  DataZoomComponentOption,
  DatasetComponent,
  DatasetComponentOption,
  GridComponent,
  GridComponentOption,
  LegendComponent,
  LegendComponentOption,
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
  DataZoomComponent,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  ToolboxComponent,
  TooltipComponent,
  TransformComponent,
  CanvasRenderer
]);

export type V1EChartsOption = echarts.ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | DataZoomComponentOption
  | DatasetComponentOption
  | GridComponentOption
  | LegendComponentOption
  | ToolboxComponentOption
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
  private themeObserver: MutationObserver | undefined;
  private initialRenderFrame: number | undefined;
  private hasRenderedOption = false;

  @Input('appV1ECharts') option: V1EChartsOption | undefined;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.chart = echarts.init(this.elementRef.nativeElement, undefined, { renderer: 'canvas' });
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
    this.chart.setOption(option, { notMerge: !isInitialRender, lazyUpdate: false });
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
    show: true,
    top: 0,
    right: 0,
    itemSize: 15,
    itemGap: 8,
    showTitle: true,
    iconStyle: {
      borderColor: theme.muted,
      color: 'transparent'
    },
    emphasis: {
      iconStyle: {
        borderColor: theme.text
      }
    },
    feature: {
      dataZoom: {
        yAxisIndex: 'none',
        title: {
          zoom: 'Zoom',
          back: 'Back'
        }
      },
      restore: {
        title: 'Reset zoom'
      },
      saveAsImage: {
        type: 'png',
        name: 'verifi-chart',
        title: 'Download PNG',
        backgroundColor: theme.surface,
        pixelRatio: 2,
        excludeComponents: ['toolbox']
      }
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

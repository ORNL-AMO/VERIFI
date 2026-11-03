import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { ECharts } from 'echarts/core';
import { echarts, V1EChartsOption } from './echarts';

export interface EChartsImageOptions {
  readonly width?: number;
  readonly height?: number;
  readonly pixelRatio?: number;
}

export const ECHARTS_IMAGE_TIMEOUT_MS = 15_000;

/** The native chart boundary can be replaced in lifecycle tests without mocking modules. */
export const ECHARTS_IMAGE_FACTORY = new InjectionToken<(host: HTMLElement, width: number, height: number) => ECharts>(
  'Report chart factory', { providedIn: 'root', factory: () => (host, width, height) =>
    echarts.init(host, undefined, { renderer: 'canvas', width, height, devicePixelRatio: 1 }) });

/** Dedicated export charts do not depend on the viewport, preview zoom, or application theme. */
@Injectable({ providedIn: 'root' })
export class EChartsImageService {
  private readonly document = inject(DOCUMENT);
  private readonly createChart = inject(ECHARTS_IMAGE_FACTORY);
  private queue: Promise<void> = Promise.resolve();

  capture(option: V1EChartsOption, options: EChartsImageOptions = {}, signal?: AbortSignal): Promise<string> {
    const width = options.width ?? 1200, height = options.height ?? 675, pixelRatio = options.pixelRatio ?? 2;
    if (![width, height, pixelRatio].every(value => Number.isFinite(value) && value > 0)
      || width > 4096 || height > 4096 || pixelRatio > 4 || Math.max(width, height) * pixelRatio > 8192) {
      return Promise.reject(new Error('Chart export dimensions are outside the supported range.'));
    }
    if (signal?.aborted) return Promise.reject(abortError());
    const capture = this.queue.then(() => this.render(option, width, height, pixelRatio, signal));
    this.queue = capture.then(() => undefined, () => undefined);
    return abortable(capture, signal);
  }

  private async render(option: V1EChartsOption, width: number, height: number, pixelRatio: number,
    signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted();
    const host = this.document.createElement('div');
    host.dataset['reportChartCapture'] = '';
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;height:${height}px;pointer-events:none;`;
    this.document.body.appendChild(host);
    let chart: ECharts | undefined, timer: ReturnType<typeof setTimeout> | undefined;
    let completed: (() => void) | undefined, aborted: (() => void) | undefined;
    try {
      chart = this.createChart(host, width, height);
      return await new Promise<string>((resolve, reject) => {
        completed = () => {
          try {
            signal?.throwIfAborted();
            const image = chart!.getDataURL({ type: 'png', pixelRatio, backgroundColor: '#ffffff',
              excludeComponents: ['toolbox', 'dataZoom'] });
            if (!image.startsWith('data:image/png;base64,')) throw new Error('The chart image could not be created.');
            resolve(image);
          } catch (error) { reject(error); }
        };
        aborted = () => reject(abortError());
        timer = setTimeout(() => reject(new Error('The chart did not finish rendering. Try exporting the report again.')),
          ECHARTS_IMAGE_TIMEOUT_MS);
        chart!.on('finished', completed);
        signal?.addEventListener('abort', aborted, { once: true });
        if (signal?.aborted) { aborted(); return; }
        chart!.setOption(documentChartOption(option), { notMerge: true, lazyUpdate: false });
      });
    } finally {
      clearTimeout(timer);
      if (aborted) signal?.removeEventListener('abort', aborted);
      if (completed) chart?.off('finished', completed);
      chart?.dispose();
      host.remove();
    }
  }
}

const DOCUMENT_COLORS: Readonly<Record<string, string>> = {
  '--v1-text': '#17231f', '--v1-muted': '#53645c', '--v1-border': '#cbd5cf',
  '--v1-surface': '#ffffff', '--v1-surface-muted': '#f1f5f2', '--v1-panel': '#ffffff',
  '--v1-chart-grid': '#d7dfda', '--v1-chart-annotation': '#53645c',
  '--v1-chart-series-1': '#c9510e', '--v1-chart-series-2': '#18794d',
  '--v1-chart-series-3': '#4156a6', '--v1-chart-series-4': '#91600f',
  '--v1-success': '#18794d', '--v1-danger': '#b91c1c', '--v1-warning': '#91600f',
  '--v1-accent': '#c9510e', '--v1-info': '#4156a6'
};

/** Resolve explicit semantic colors without reading or mutating the current UI theme. */
export function documentChartOption(option: V1EChartsOption): V1EChartsOption {
  const resolved = resolveDocumentColors(option) as Record<string, unknown>;
  const axis = (value: unknown): unknown => Array.isArray(value) ? value.map(axis) : {
    ...(isRecord(value) ? value : {}),
    axisLabel: { color: DOCUMENT_COLORS['--v1-muted'], ...(isRecord(value) && isRecord(value['axisLabel']) ? value['axisLabel'] : {}) },
    nameTextStyle: { color: DOCUMENT_COLORS['--v1-text'], ...(isRecord(value) && isRecord(value['nameTextStyle']) ? value['nameTextStyle'] : {}) },
    axisLine: { lineStyle: { color: DOCUMENT_COLORS['--v1-border'] }, ...(isRecord(value) && isRecord(value['axisLine']) ? value['axisLine'] : {}) },
    splitLine: { lineStyle: { color: DOCUMENT_COLORS['--v1-chart-grid'] }, ...(isRecord(value) && isRecord(value['splitLine']) ? value['splitLine'] : {}) }
  };
  return {
    ...resolved, animation: false, animationDuration: 0, animationDurationUpdate: 0,
    backgroundColor: '#ffffff', color: [1, 2, 3, 4].map(index => DOCUMENT_COLORS[`--v1-chart-series-${index}`]),
    textStyle: { color: DOCUMENT_COLORS['--v1-text'], fontFamily: 'Arial, Helvetica, sans-serif',
      ...(isRecord(resolved['textStyle']) ? resolved['textStyle'] : {}) },
    legend: mapRecords(resolved['legend'], item => ({ ...item, textStyle: {
      color: DOCUMENT_COLORS['--v1-muted'], ...(isRecord(item['textStyle']) ? item['textStyle'] : {}) } })),
    tooltip: { show: false }, toolbox: { show: false }, dataZoom: [],
    ...(resolved['xAxis'] ? { xAxis: axis(resolved['xAxis']) } : {}),
    ...(resolved['yAxis'] ? { yAxis: axis(resolved['yAxis']) } : {}),
    series: mapRecords(resolved['series'], item => ({ ...item, animation: false, progressive: 0,
      emphasis: { disabled: true }, select: { disabled: true } }))
  } as V1EChartsOption;
}

function resolveDocumentColors(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/var\((--[\w-]+)(?:,\s*([^)]+))?\)/g, (_match, name: string, fallback?: string) => {
      const color = DOCUMENT_COLORS[name] ?? fallback?.trim();
      if (!color) throw new Error(`The chart export has an unsupported color: ${name}.`);
      return color;
    });
  }
  if (Array.isArray(value)) return value.map(resolveDocumentColors);
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveDocumentColors(item)]));
  return value;
}

function mapRecords(value: unknown, project: (item: Record<string, unknown>) => Record<string, unknown>): unknown {
  return Array.isArray(value) ? value.map(item => project(isRecord(item) ? item : {})) : project(isRecord(value) ? value : {});
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function abortError(): DOMException { return new DOMException('Chart export cancelled.', 'AbortError'); }

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(abortError());
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

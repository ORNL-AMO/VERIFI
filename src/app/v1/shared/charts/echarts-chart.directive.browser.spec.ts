import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import * as echarts from 'echarts/core';
import {
  EChartsChartDirective,
  V1EChartsDataZoomRange,
  V1EChartsOption,
  V1EChartsPointClickEvent,
  v1ChartPngFileName
} from './echarts-chart.directive';

@Component({
  template: `<div class="chart-host" [appV1ECharts]="option()"></div>`,
  standalone: true,
  imports: [EChartsChartDirective]
})
class EChartsDirectiveHostComponent {
  readonly zoom = signal<{ readonly start: number; readonly end: number } | undefined>(undefined);
  readonly pointClick = signal<V1EChartsPointClickEvent | undefined>(undefined);
  readonly option = signal<V1EChartsOption>({
    xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr'] },
    yAxis: { type: 'value' },
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    series: [{ type: 'bar', data: [1, 2, 3, 4] }]
  } as V1EChartsOption);

  retainZoom(range: V1EChartsDataZoomRange): void {
    this.zoom.set(range);
    this.option.update(option => ({ ...option, dataZoom: [{ type: 'inside', ...range }] }));
  }
}

describe('EChartsChartDirective in Chromium', () => {
  it('preserves existing PNG extensions when sanitizing chart filenames', () => {
    expect(v1ChartPngFileName('meter-chart.png')).toBe('meter-chart.png');
    expect(v1ChartPngFileName('meter chart.png')).toBe('meter-chart.png');
    expect(v1ChartPngFileName('')).toBe('chart.png');
  });

  it('initializes and updates an ECharts canvas', async () => {
    TestBed.configureTestingModule({
      imports: [EChartsDirectiveHostComponent]
    });
    const fixture = TestBed.createComponent(EChartsDirectiveHostComponent);
    fixture.nativeElement.querySelector('.chart-host').style.width = '360px';
    fixture.nativeElement.querySelector('.chart-host').style.height = '240px';
    fixture.detectChanges();
    await fixture.whenStable();
    await nextAnimationFrame();

    expect(fixture.nativeElement.querySelector('canvas')).not.toBeNull();

    fixture.componentInstance.option.set({
      xAxis: { type: 'category', data: ['Mar', 'Apr'] },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'line',
          data: [3, 4],
          markArea: {
            data: [[{ name: 'Expected range', yAxis: 2 }, { yAxis: 5 }]]
          }
        },
        { type: 'scatter', data: [3, 4] }
      ]
    } as V1EChartsOption);
    fixture.detectChanges();
    await fixture.whenStable();
    await nextAnimationFrame();

    expect(fixture.nativeElement.querySelector('canvas')).not.toBeNull();
    expect((echarts.getInstanceByDom(fixture.nativeElement.querySelector('.chart-host'))?.getOption() as Record<string, unknown[]>).series)
      .toHaveLength(2);
    expect((echarts.getInstanceByDom(fixture.nativeElement.querySelector('.chart-host'))?.getOption() as Record<string, unknown>).series)
      .toEqual(expect.arrayContaining([expect.objectContaining({ markArea: expect.any(Object) })]));
  });

  it('emits ECharts data zoom changes', async () => {
    TestBed.overrideComponent(EChartsDirectiveHostComponent, {
      set: {
        template: `<div class="chart-host" [appV1ECharts]="option()" (dataZoomChanged)="zoom.set($event)"></div>`
      }
    });
    TestBed.configureTestingModule({
      imports: [EChartsDirectiveHostComponent]
    });
    const fixture = TestBed.createComponent(EChartsDirectiveHostComponent);
    const host = fixture.nativeElement.querySelector('.chart-host') as HTMLElement;
    host.style.width = '360px';
    host.style.height = '240px';
    fixture.detectChanges();
    await fixture.whenStable();
    await nextAnimationFrame();

    echarts.getInstanceByDom(host)?.dispatchAction({ type: 'dataZoom', start: 20, end: 60 });
    await fixture.whenStable();

    expect(fixture.componentInstance.zoom()).toEqual({ start: 20, end: 60 });
  });

  it('emits clicks on chart series points', async () => {
    TestBed.overrideComponent(EChartsDirectiveHostComponent, {
      set: {
        template: `<div class="chart-host" [appV1ECharts]="option()" (chartPointClicked)="pointClick.set($event)"></div>`
      }
    });
    TestBed.configureTestingModule({ imports: [EChartsDirectiveHostComponent] });
    const fixture = TestBed.createComponent(EChartsDirectiveHostComponent);
    const host = fixture.nativeElement.querySelector('.chart-host') as HTMLElement;
    host.style.width = '360px';
    host.style.height = '240px';
    fixture.detectChanges();
    await fixture.whenStable();
    await nextAnimationFrame();

    const chart = echarts.getInstanceByDom(host) as unknown as {
      trigger: (eventName: string, event: V1EChartsPointClickEvent) => void;
    };
    chart.trigger('click', { componentType: 'series', seriesIndex: 0, dataIndex: 1, name: 'Feb', value: 2 });

    expect(fixture.componentInstance.pointClick()).toEqual(expect.objectContaining({
      componentType: 'series', seriesIndex: 0, dataIndex: 1, name: 'Feb', value: 2
    }));
  });

  it('removes stale series and axes when an updated option shrinks them', async () => {
    TestBed.configureTestingModule({
      imports: [EChartsDirectiveHostComponent]
    });
    const fixture = TestBed.createComponent(EChartsDirectiveHostComponent);
    const host = fixture.nativeElement.querySelector('.chart-host') as HTMLElement;
    host.style.width = '360px';
    host.style.height = '240px';
    fixture.componentInstance.option.set({
      grid: [{}, {}],
      xAxis: [{ type: 'category', data: ['Jan', 'Feb'] }, { type: 'category', data: ['Jan', 'Feb'] }],
      yAxis: [{ type: 'value' }, { type: 'value' }],
      series: [
        { name: 'Utility', type: 'bar', data: [1, 2] },
        { name: 'Cost', type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: [3, 4] }
      ]
    } as V1EChartsOption);
    fixture.detectChanges();
    await fixture.whenStable();
    await nextAnimationFrame();

    let chartOption = echarts.getInstanceByDom(host)?.getOption() as Record<string, unknown[]>;
    expect(chartOption['grid']).toHaveLength(2);
    expect(chartOption['xAxis']).toHaveLength(2);
    expect(chartOption['series']).toHaveLength(2);
    expect(chartOption['yAxis']).toHaveLength(2);

    fixture.componentInstance.option.set({
      grid: [{}],
      xAxis: { type: 'category', data: ['Jan', 'Feb'] },
      yAxis: [{ type: 'value' }],
      series: [{ name: 'Cost', type: 'line', data: [3, 4] }]
    } as V1EChartsOption);
    fixture.detectChanges();
    await fixture.whenStable();
    await nextAnimationFrame();

    chartOption = echarts.getInstanceByDom(host)?.getOption() as Record<string, unknown[]>;
    expect(chartOption['grid']).toHaveLength(1);
    expect(chartOption['xAxis']).toHaveLength(1);
    expect(chartOption['series']).toHaveLength(1);
    expect(chartOption['yAxis']).toHaveLength(1);
    expect(chartOption['toolbox']).toEqual([expect.objectContaining({ show: false })]);
  });

  it('keeps native sizing and zoom stable through layout, theme, and hidden-to-visible changes', async () => {
    const NativeResizeObserver = window.ResizeObserver;
    let host: HTMLElement | undefined, frame = 0, frameRequest: number;
    const notifications: { frame: number; width: number; height: number }[] = [];
    const resizeFrames: number[] = [], errors: string[] = [];
    const measurements: { phase: string; host: number[]; chart: number[]; notifications: number; resizes: number; errors: number }[] = [];
    const onError = (event: ErrorEvent) => {
      if (event.message.includes('ResizeObserver')) errors.push(event.message);
    };
    const tick = () => { frame++; frameRequest = requestAnimationFrame(tick); };
    frameRequest = requestAnimationFrame(tick);
    window.addEventListener('error', onError);
    vi.stubGlobal('ResizeObserver', class extends NativeResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        super((entries, observer) => {
          for (const entry of entries) if (entry.target === host) notifications.push({ frame, width: entry.contentRect.width, height: entry.contentRect.height });
          callback(entries, observer);
        });
      }
    });
    TestBed.overrideComponent(EChartsDirectiveHostComponent, {
      set: { template: '<div class="v1-root"><div class="chart-host" [appV1ECharts]="option()" (dataZoomChanged)="retainZoom($event)"></div></div>' }
    });
    TestBed.configureTestingModule({ imports: [EChartsDirectiveHostComponent] });
    const fixture = TestBed.createComponent(EChartsDirectiveHostComponent);
    host = fixture.nativeElement.querySelector('.chart-host') as HTMLElement;
    const root = fixture.nativeElement.querySelector('.v1-root') as HTMLElement;
    host.style.width = '360px'; host.style.height = '240px';
    try {
      fixture.detectChanges();
      const chart = echarts.getInstanceByDom(host)!;
      const originalResize = chart.resize.bind(chart);
      const resize = vi.spyOn(chart, 'resize').mockImplementation(options => {
        resizeFrames.push(frame);
        return originalResize(options);
      });
      const record = (phase: string) => measurements.push({ phase,
        host: [host!.clientWidth, host!.clientHeight], chart: [chart.getWidth(), chart.getHeight()],
        notifications: notifications.length, resizes: resize.mock.calls.length, errors: errors.length });
      await settleChartDimensions(host, chart); record('initial');
      chart.dispatchAction({ type: 'dataZoom', start: 20, end: 60 });
      fixture.detectChanges();
      host.style.width = '480px'; host.style.height = '280px';
      await settleChartDimensions(host, chart); record('layout');
      expect((chart.getOption() as { dataZoom: { start: number; end: number }[] }).dataZoom[0]).toMatchObject({ start: 20, end: 60 });

      const beforeTheme = resize.mock.calls.length;
      root.style.setProperty('--v1-text', '#ffffff'); root.classList.add('v1-theme-dark');
      await settleChartDimensions(host, chart); record('theme');
      expect(resize).toHaveBeenCalledTimes(beforeTheme);
      expect((chart.getOption() as { textStyle: { color: string } }).textStyle.color).toBe('#ffffff');

      const beforeHidden = resize.mock.calls.length;
      root.style.display = 'none';
      await nextAnimationFrame(); await nextAnimationFrame(); await nextAnimationFrame(); record('hidden');
      expect(resize).toHaveBeenCalledTimes(beforeHidden);
      root.style.display = ''; host.style.width = '520px'; host.style.height = '300px';
      await settleChartDimensions(host, chart); record('visible');
      expect(chart.getWidth()).toBe(520); expect(chart.getHeight()).toBe(300);
      expect((chart.getOption() as { dataZoom: { start: number; end: number }[] }).dataZoom[0]).toMatchObject({ start: 20, end: 60 });
      expect(new Set(resizeFrames).size).toBe(resizeFrames.length);
      expect(errors).toEqual([]);
      expect(notifications.some(entry => entry.width === 0 && entry.height === 0)).toBe(true);
      console.info('ECharts native resize measurements', JSON.stringify(measurements));

      const beforeDestroy = resize.mock.calls.length;
      fixture.destroy();
      await nextAnimationFrame(); await nextAnimationFrame();
      expect(chart.isDisposed()).toBe(true); expect(resize).toHaveBeenCalledTimes(beforeDestroy);
    } finally {
      fixture.destroy(); cancelAnimationFrame(frameRequest);
      window.removeEventListener('error', onError); vi.unstubAllGlobals();
    }
  });

  it('coalesces changed-size deliveries outside the observer and cancels pending resize work on destruction', async () => {
    let observerCallback!: ResizeObserverCallback, observer!: ResizeObserver;
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) { observerCallback = callback; observer = this; }
      observe(): void { }
      unobserve(): void { }
      disconnect = disconnect;
    });
    TestBed.configureTestingModule({ imports: [EChartsDirectiveHostComponent] });
    const fixture = TestBed.createComponent(EChartsDirectiveHostComponent);
    const host = fixture.nativeElement.querySelector('.chart-host') as HTMLElement;
    host.style.width = '360px'; host.style.height = '240px';
    try {
      fixture.detectChanges(); await fixture.whenStable(); await nextAnimationFrame();
      const chart = echarts.getInstanceByDom(host)!, resize = vi.spyOn(chart, 'resize');
      const notify = (width: number, height: number) => observerCallback([
        { target: host, contentRect: new DOMRectReadOnly(0, 0, width, height),
          borderBoxSize: [{ inlineSize: width, blockSize: height }],
          contentBoxSize: [{ inlineSize: width, blockSize: height }],
          devicePixelContentBoxSize: [{ inlineSize: width * devicePixelRatio, blockSize: height * devicePixelRatio }] }
      ], observer);
      notify(360, 240); await nextAnimationFrame();
      expect(resize).not.toHaveBeenCalled();
      host.style.width = '420px'; host.style.height = '260px';
      notify(400, 250); notify(410, 255); notify(420, 260);
      host.style.width = '440px';
      expect(resize).not.toHaveBeenCalled();
      await nextAnimationFrame();
      expect(resize).toHaveBeenCalledTimes(1);
      expect(chart.getWidth()).toBe(440); expect(chart.getHeight()).toBe(260);
      notify(440, 260); await nextAnimationFrame();
      notify(0, 0); await nextAnimationFrame();
      notify(440, 260); await nextAnimationFrame();
      expect(resize).toHaveBeenCalledTimes(1);

      host.style.boxSizing = 'border-box'; host.style.padding = '10px';
      notify(420, 240); await nextAnimationFrame();
      expect(chart.getWidth()).toBe(420); expect(chart.getHeight()).toBe(240);
      expect(resize).toHaveBeenCalledTimes(2);
      notify(420, 240); await nextAnimationFrame();
      expect(resize).toHaveBeenCalledTimes(2);

      host.style.width = '460px'; notify(440, 240);
      fixture.destroy(); await nextAnimationFrame();
      expect(disconnect).toHaveBeenCalledOnce(); expect(chart.isDisposed()).toBe(true);
      expect(resize).toHaveBeenCalledTimes(2);
      notify(460, 260); await nextAnimationFrame();
      expect(resize).toHaveBeenCalledTimes(2);
    } finally { fixture.destroy(); vi.unstubAllGlobals(); }
  });
});

function nextAnimationFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

async function settleChartDimensions(host: HTMLElement, chart: ReturnType<typeof echarts.getInstanceByDom>): Promise<void> {
  let stableFrames = 0, previous = '';
  for (let attempt = 0; attempt < 20; attempt++) {
    await nextAnimationFrame();
    const dimensions = JSON.stringify([host.clientWidth, host.clientHeight, chart!.getWidth(), chart!.getHeight()]);
    stableFrames = dimensions === previous && chart!.getWidth() === host.clientWidth && chart!.getHeight() === host.clientHeight ? stableFrames + 1 : 0;
    if (stableFrames >= 3) return;
    previous = dimensions;
  }
  throw new Error('The chart dimensions did not settle to the visible host size.');
}

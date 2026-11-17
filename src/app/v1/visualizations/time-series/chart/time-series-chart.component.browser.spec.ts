import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { echarts } from '@app/v1/shared/charts/echarts';
import { TimeSeriesModule } from '../time-series.module';
import type { TimeSeriesModel } from '../time-series.models';
import { TimeSeriesChartComponent } from './time-series-chart.component';

describe('saved time-series canvas in Chromium', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('renders line and bar items together with a zero-based bar axis', async () => {
    const slots = ['Jan', 'Feb', 'Mar'].map((key, order) => ({ key, label: key, order }));
    const points: TimeSeriesModel['traces'][number]['points'] = slots.map((slot, index) => ({ slot: slot.key,
      start: `2026-0${index + 1}-01`, end: `2026-0${index + 1}-28`,
      observation: { state: 'observed', value: index * 10, provenance: 'measured', partial: false } }));
    const model: TimeSeriesModel = { title: 'Mixed chart', chart: { kind: 'time-series', defaultTraceType: 'line', interval: 'monthly', stack: 'none' },
      legend: true, warnings: [], slots, traces: [
        { id: 'line', type: 'line', label: 'Line item', unit: 'kWh', axis: 'left', color: '#23684d', lineStyle: 'solid', role: 'primary', points },
        { id: 'bar', type: 'bar', label: 'Bar item', unit: 'kWh', axis: 'left', color: '#b44a19', lineStyle: 'solid', role: 'primary', points }
      ] };
    TestBed.configureTestingModule({ imports: [TimeSeriesModule] });
    const fixture = TestBed.createComponent(TimeSeriesChartComponent);
    const root = fixture.nativeElement as HTMLElement;
    root.className = 'v1-root'; root.style.width = '640px';
    fixture.componentRef.setInput('model', model); fixture.detectChanges();
    try {
      await vi.waitFor(() => expect(root.querySelector('canvas')).not.toBeNull());
      const chart = echarts.getInstanceByDom(root.querySelector<HTMLElement>('.time-series-canvas')!)!;
      const option = chart.getOption() as any;
      expect(option.series.map((series: any) => series.type)).toEqual(['line', 'bar']);
      expect(option.yAxis[0].scale).toBe(false);
      expect(option.series[1].data).toEqual([['Jan', 0], ['Feb', 10], ['Mar', 20]]);
    } finally { fixture.destroy(); }
  });
  it('renders stacked areas with true gaps, preserving zoom for appearance and resetting changed data windows', async () => {
    const slots = ['a', 'b', 'c', 'd'].map((key, order) => ({ key, label: key, order }));
    const points: TimeSeriesModel['traces'][number]['points'] = slots.map((slot, index) => ({ slot: slot.key,
      start: `2026-0${index + 1}-01`, end: `2026-0${index + 1}-28`, observation: index === 1
        ? { state: 'missing', value: null, reason: 'Missing bill' } : { state: 'observed', value: index * 10, provenance: 'measured', partial: false } }));
    const model: TimeSeriesModel = { title: 'Area gaps', windowKey: 'original-periods', chart: { kind: 'time-series', defaultTraceType: 'area', interval: 'monthly', stack: 'absolute' },
      legend: true, warnings: [], slots, traces: [{ id: 'area', type: 'area', label: 'Area', unit: 'kWh', axis: 'left', color: '#23684d', lineStyle: 'solid', role: 'primary', points }] };
    TestBed.configureTestingModule({ imports: [TimeSeriesModule] });
    const fixture = TestBed.createComponent(TimeSeriesChartComponent), root = fixture.nativeElement as HTMLElement;
    root.style.width = '640px'; fixture.componentRef.setInput('model', model); fixture.detectChanges();
    try {
      const element = root.querySelector<HTMLElement>('.time-series-canvas')!;
      await vi.waitFor(() => expect(echarts.getInstanceByDom(element)?.getOption()).toBeDefined());
      const chart = echarts.getInstanceByDom(element)!;
      expect((chart.getOption() as any).series[0]).toMatchObject({ type: 'line', stack: 'primary', connectNulls: false });
      expect((chart.getOption() as any).series[0].data).toEqual([['a', 0], ['b', null], ['c', 20], ['d', 30]]);
      expect((chart.getOption() as any).series[0].areaStyle).toBeDefined();
      chart.dispatchAction({ type: 'dataZoom', start: 25, end: 75 }); fixture.detectChanges();
      fixture.componentRef.setInput('model', { ...model, title: 'New label', legend: false }); fixture.detectChanges();
      expect(echarts.getInstanceByDom(element)).toBe(chart);
      expect(fixture.componentInstance.zoom()).toEqual({ start: 25, end: 75 });
      fixture.componentRef.setInput('model', { ...model, windowKey: 'changed-periods' }); fixture.detectChanges();
      expect(fixture.componentInstance.zoom()).toEqual({ start: 0, end: 100 });
    } finally { fixture.destroy(); }
  });
  it('clears stacking and area fill when returning to unstacked lines on the same canvas', async () => {
    const slots = ['a', 'b', 'c', 'd'].map((key, order) => ({ key, label: key, order }));
    const model: TimeSeriesModel = { title: 'Presentation transitions', windowKey: 'same-periods',
      chart: { kind: 'time-series', defaultTraceType: 'area', interval: 'monthly', stack: 'absolute' },
      legend: true, warnings: [], slots, traces: [20, 80].map((value, index) => ({ id: `series-${index}`, type: 'area',
        label: `Series ${index}`, unit: 'kWh', axis: 'left', color: index ? '#b44a19' : '#23684d', lineStyle: 'solid', role: 'primary',
        points: slots.map((slot, month) => ({ slot: slot.key, start: `2026-0${month + 1}-01`, end: `2026-0${month + 1}-28`,
          observation: { state: 'observed', value, provenance: 'measured', partial: false } })) })) };
    TestBed.configureTestingModule({ imports: [TimeSeriesModule] });
    const fixture = TestBed.createComponent(TimeSeriesChartComponent), root = fixture.nativeElement as HTMLElement;
    root.style.width = '640px'; fixture.componentRef.setInput('model', model); fixture.detectChanges();
    try {
      const element = root.querySelector<HTMLElement>('.time-series-canvas')!;
      await vi.waitFor(() => expect(echarts.getInstanceByDom(element)?.getOption()).toBeDefined());
      const chart = echarts.getInstanceByDom(element)!;
      const plottedSecondValue = () => {
        const data = (chart as any).getModel().getSeriesByIndex(1).getData();
        return data.get(data.getCalculationInfo('stackResultDimension') ?? data.mapDimension('y'), 0);
      };
      expect(plottedSecondValue()).toBe(100);
      chart.dispatchAction({ type: 'dataZoom', start: 25, end: 75 }); fixture.detectChanges();
      fixture.componentRef.setInput('model', { ...model, chart: { ...model.chart, defaultTraceType: 'line', stack: 'none' },
        traces: model.traces.map(trace => ({ ...trace, type: 'line' })) }); fixture.detectChanges();
      expect(echarts.getInstanceByDom(element)).toBe(chart);
      expect(plottedSecondValue()).toBe(80);
      expect((chart as any).getModel().getSeriesByIndex(0).getModel('areaStyle').isEmpty()).toBe(true);
      expect(fixture.componentInstance.zoom()).toEqual({ start: 25, end: 75 });
    } finally { fixture.destroy(); }
  });
  it('renders real zero/gaps, resizes without remounting or losing zoom, omits reset controls and disposes the canvas', async () => {
    const model: TimeSeriesModel = { title: 'Monthly energy', chart: { kind: 'time-series', defaultTraceType: 'line', interval: 'monthly', stack: 'none' }, legend: true, warnings: ['Partial coverage'],
      slots: ['Jan', 'Feb', 'Mar', 'Apr'].map((key, order) => ({ key, label: key, order })),
      traces: [{ id: 'energy', type: 'line', label: 'Energy', unit: 'kWh', axis: 'left', color: 'var(--v1-chart-series-1)', lineStyle: 'solid', role: 'primary',
        points: ['Jan', 'Feb', 'Mar', 'Apr'].map((slot, index) => ({ slot, start: `2026-0${index + 1}-01`, end: `2026-0${index + 1}-28`, observation: index === 1
          ? { state: 'missing', value: null, reason: 'Missing bill' } : { state: 'observed', value: index === 0 ? 0 : index * 5, provenance: 'measured', partial: false } })) }] };
    TestBed.configureTestingModule({ imports: [TimeSeriesModule] });
    const fixture = TestBed.createComponent(TimeSeriesChartComponent), root = fixture.nativeElement as HTMLElement;
    root.style.width = '480px'; root.className = 'v1-root';
    root.style.setProperty('--v1-chart-series-1', '#1d8f5c');
    fixture.componentRef.setInput('model', model); fixture.detectChanges();
    await frame(); await frame();
    const canvasHost = root.querySelector<HTMLElement>('.time-series-canvas')!, chart = echarts.getInstanceByDom(canvasHost)!;
    try {
      expect(chart).toBeDefined();
      expect((chart.getOption() as any).series[0].data).toEqual([['Jan', 0], ['Feb', null], ['Mar', 10], ['Apr', 15]]);
      chart.dispatchAction({ type: 'dataZoom', start: 25, end: 75 }); fixture.detectChanges();
      expect(fixture.componentInstance.zoom()).toEqual({ start: 25, end: 75 });
      root.style.width = '720px';
      await vi.waitFor(() => expect(chart.getWidth()).toBe(720));
      expect(echarts.getInstanceByDom(canvasHost)).toBe(chart);
      expect(fixture.componentInstance.zoom()).toEqual({ start: 25, end: 75 });
      expect((chart.getOption() as any).dataZoom[0]).toMatchObject({ start: 25, end: 75 });
      expect(root.querySelector('button, details, .time-series-warning')).toBeNull();
      for (const theme of ['v1-root', 'v1-root v1-theme-dark', 'v1-root v1-theme-dark v1-contrast-strong']) {
        root.className = theme; root.style.width = '280px'; fixture.detectChanges(); await frame(); await frame();
        await vi.waitFor(() => expect(chart.getWidth()).toBe(280));
        expect(canvasHost.scrollWidth).toBeLessThanOrEqual(281);
      }
      expect(canvasHost.getAttribute('aria-label')).toContain('Hover over points');
      fixture.destroy(); expect(chart.isDisposed()).toBe(true);
    } finally { fixture.destroy(); }
  });
});

function frame(): Promise<void> { return new Promise(resolve => requestAnimationFrame(() => resolve())); }

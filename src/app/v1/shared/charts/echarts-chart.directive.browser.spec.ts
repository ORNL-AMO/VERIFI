import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import * as echarts from 'echarts/core';
import { EChartsChartDirective, V1EChartsOption, v1ChartPngFileName } from './echarts-chart.directive';

@Component({
  template: `<div class="chart-host" [appV1ECharts]="option()"></div>`,
  standalone: true,
  imports: [EChartsChartDirective]
})
class EChartsDirectiveHostComponent {
  readonly zoom = signal<{ readonly start: number; readonly end: number } | undefined>(undefined);
  readonly option = signal<V1EChartsOption>({
    xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr'] },
    yAxis: { type: 'value' },
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    series: [{ type: 'bar', data: [1, 2, 3, 4] }]
  } as V1EChartsOption);
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
});

function nextAnimationFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

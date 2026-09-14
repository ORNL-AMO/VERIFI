import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import * as echarts from 'echarts/core';
import { EChartsChartDirective, V1EChartsOption } from './echarts-chart.directive';

@Component({
  template: `<div class="chart-host" [appV1ECharts]="option()"></div>`,
  standalone: true,
  imports: [EChartsChartDirective]
})
class EChartsDirectiveHostComponent {
  readonly option = signal<V1EChartsOption>({
    xAxis: { type: 'category', data: ['Jan', 'Feb'] },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: [1, 2] }]
  } as V1EChartsOption);
}

describe('EChartsChartDirective in Chromium', () => {
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
      series: [{ type: 'line', data: [3, 4] }]
    } as V1EChartsOption);
    fixture.detectChanges();
    await fixture.whenStable();
    await nextAnimationFrame();

    expect(fixture.nativeElement.querySelector('canvas')).not.toBeNull();
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
      xAxis: { type: 'category', data: ['Jan', 'Feb'] },
      yAxis: [{ type: 'value' }, { type: 'value' }],
      series: [
        { name: 'Utility', type: 'bar', data: [1, 2] },
        { name: 'Cost', type: 'line', yAxisIndex: 1, data: [3, 4] }
      ]
    } as V1EChartsOption);
    fixture.detectChanges();
    await fixture.whenStable();
    await nextAnimationFrame();

    let chartOption = echarts.getInstanceByDom(host)?.getOption() as Record<string, unknown[]>;
    expect(chartOption['series']).toHaveLength(2);
    expect(chartOption['yAxis']).toHaveLength(2);

    fixture.componentInstance.option.set({
      xAxis: { type: 'category', data: ['Jan', 'Feb'] },
      yAxis: [{ type: 'value' }],
      series: [{ name: 'Cost', type: 'line', data: [3, 4] }]
    } as V1EChartsOption);
    fixture.detectChanges();
    await fixture.whenStable();
    await nextAnimationFrame();

    chartOption = echarts.getInstanceByDom(host)?.getOption() as Record<string, unknown[]>;
    expect(chartOption['series']).toHaveLength(1);
    expect(chartOption['yAxis']).toHaveLength(1);
    expect(chartOption['toolbox']).toEqual([expect.objectContaining({ show: false })]);
  });
});

function nextAnimationFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

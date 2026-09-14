import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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
});

function nextAnimationFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

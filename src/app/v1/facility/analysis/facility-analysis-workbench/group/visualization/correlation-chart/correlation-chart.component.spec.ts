import { Directive, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { CorrelationChartComponent } from './correlation-chart.component';
import { correlationOption } from '../group-visualization-charts';
import type { VisualizationPredictor } from '../group-visualization.models';

@Directive({ selector: '[appV1ECharts]', standalone: true })
class ChartStub { @Input('appV1ECharts') option: unknown; }

describe('CorrelationChartComponent', () => {
  const predictor: VisualizationPredictor = { guid: 'p', name: 'Production', unit: 'widgets', label: 'Production (widgets)',
    style: { slot: 0, color: 'var(--v1-chart-series-1)', lineStyle: 'solid' } };

  it('renders statistics without a sample-count detail, then explains an insufficient sample', () => {
    TestBed.overrideComponent(CorrelationChartComponent, { remove: { imports: [EChartsChartDirective] }, add: { imports: [ChartStub] } });
    TestBed.configureTestingModule({ imports: [CorrelationChartComponent] });
    const fixture = TestBed.createComponent(CorrelationChartComponent);
    fixture.componentRef.setInput('predictor', predictor);
    fixture.componentRef.setInput('usageLabel', 'Group usage (MMBtu)');
    fixture.componentRef.setInput('summary', { pairs: [{ x: 1, y: 2, label: 'Jan 2024' }], r: -0.5, rSquared: .25, slope: -1, intercept: 3 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('paired months');
    expect(fixture.nativeElement.textContent).toContain('r = -0.5 · R² = 0.25');
    const equation = () => fixture.nativeElement.querySelector('.correlation-equation') as HTMLElement | null;
    expect(equation()?.textContent).toBe('y = -1x + 3');
    expect(equation()?.previousElementSibling?.textContent).toContain('r = -0.5');
    expect(equation()?.getAttribute('aria-label')).toContain('y is Group usage (MMBtu); x is Production (widgets)');
    for (const [slope, intercept, expected] of [
      [1.234567, -123.456789, 'y = 1.2346x − 123.46'],
      [0.0000123456789, 0, 'y = 0.000012346x + 0'],
      [NaN, 3, undefined], [2, Infinity, undefined]
    ] as const) {
      fixture.componentRef.setInput('summary', { pairs: [], r: .5, rSquared: .25, slope, intercept });
      fixture.detectChanges();
      expect(equation()?.textContent).toBe(expected);
    }
    fixture.componentRef.setInput('summary', { pairs: [], unavailableReason: 'At least three complete paired months are needed.' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('At least three');
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.correlation-chart')).toBeNull();
    expect(equation()).toBeNull();
  });

  it('preserves month metadata in scatter points and draws the fitted line over the observed predictor extent', () => {
    const option = correlationOption(predictor, { pairs: [{ x: -2, y: -3, label: 'Jan 2024' }, { x: 3, y: 7, label: 'Feb 2024' }],
      slope: 2, intercept: 1 }, 'Group usage (MMBtu)') as any;
    expect(option.series[0].data).toEqual([[-2, -3, 'Jan 2024'], [3, 7, 'Feb 2024']]);
    expect(option.series[1].data).toEqual([[-2, -3], [3, 7]]);
    expect(option.tooltip.formatter({ value: [-2, -3, 'Jan 2024'] })).toContain('Jan 2024');
  });
});

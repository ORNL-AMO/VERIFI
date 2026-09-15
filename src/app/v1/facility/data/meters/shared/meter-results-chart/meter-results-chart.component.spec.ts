import { Directive, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { EChartsChartDirective, V1EChartsDataZoomRange, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { MeterResultsChartComponent } from './meter-results-chart.component';

describe('MeterResultsChartComponent', () => {
  it('defaults utility and cost to line charts with zoom controls', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    expect(component.utilityDisplay()).toBe('line');
    expect(component.costDisplay()).toBe('line');

    const option = component.chartOption() as Record<string, any>;
    expect(option.xAxis.data).toEqual(['Jan 2026', 'Feb 2026', 'Mar 2026']);
    expect(option.series.map((series: { name: string; type: string }) => [series.name, series.type])).toEqual([
      ['Total Energy', 'line'],
      ['Total Cost', 'line']
    ]);
    expect(option.yAxis).toHaveLength(2);
    expect(option.yAxis.every((axis: { alignTicks?: boolean }) => axis.alignTicks)).toBe(true);
    expect('axisLabel' in option.yAxis[0]).toBe(false);
    expect(option.yAxis[1].axisLabel).toEqual({ formatter: '${value}' });
    expect(option.dataZoom).toHaveLength(2);
  });

  it('uses the grouping-style display toggles for each visible series', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.setUtilityDisplay('line');
    component.setCostDisplay('off');
    fixture.detectChanges();

    const option = component.chartOption() as Record<string, any>;
    expect(option.series.map((series: { name: string; type: string }) => [series.name, series.type])).toEqual([
      ['Total Energy', 'line']
    ]);
    expect(component.hasChartSeries()).toBe(true);

    component.setUtilityDisplay('off');

    expect(component.hasChartSeries()).toBe(false);
  });

  it('keeps yearly utility and cost series as lines by default', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('period', 'yearly');
    fixture.detectChanges();

    const option = component.chartOption() as Record<string, any>;
    expect(component.utilityDisplay()).toBe('line');
    expect(component.costDisplay()).toBe('line');
    expect(option.series.map((series: { name: string; type: string }) => [series.name, series.type])).toEqual([
      ['Total Energy', 'line'],
      ['Total Cost', 'line']
    ]);
  });

  it('keeps monthly utility and cost as lines by default', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    expect(component.utilityDisplay()).toBe('line');
    expect(component.costDisplay()).toBe('line');
  });

  it('zooms in, zooms out, and resets the chart window', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.zoomIn();

    expect(component.zoomStart()).toBe(20);
    expect(component.zoomEnd()).toBe(80);

    component.zoomOut();

    expect(component.zoomStart()).toBe(0);
    expect(component.zoomEnd()).toBe(100);

    component.zoomIn();
    component.resetZoom();

    expect(component.zoomStart()).toBe(0);
    expect(component.zoomEnd()).toBe(100);
  });

  it('keeps zoom centered within the chart edges', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    component.zoomStart.set(80);
    component.zoomEnd.set(100);

    component.zoomOut();

    expect(component.zoomStart()).toBeCloseTo(66.666, 2);
    expect(component.zoomEnd()).toBe(100);
  });

  it('syncs interactive chart slider zoom before rebuilding options', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const chartDirective = component.chartDirective as unknown as EChartsStubDirective;

    chartDirective.dataZoomChanged.emit({ start: 25, end: 75 });
    fixture.detectChanges();
    component.setCostDisplay('off');

    const option = component.chartOption() as Record<string, any>;
    expect(component.zoomStart()).toBe(25);
    expect(component.zoomEnd()).toBe(75);
    expect(option.dataZoom[0]).toMatchObject({ start: 25, end: 75 });
  });

  it('formats currency tooltips with cents while keeping utility values rounded', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const option = component.chartOption() as Record<string, any>;
    const tooltip = option.tooltip.formatter([
      { axisValueLabel: 'Jan 2026', marker: '', seriesName: 'Total Energy', value: 10.4 },
      { axisValueLabel: 'Jan 2026', marker: '', seriesName: 'Total Cost', value: 30.49 }
    ]);

    expect(tooltip).toContain('Total Energy: 10');
    expect(tooltip).toContain('Total Cost: $30.49');
  });

  it('provides a screen-reader data table for the rendered chart', () => {
    const fixture = setup();

    const table = fixture.nativeElement.querySelector('.v1-meter-results-chart__accessible-data') as HTMLTableElement;
    expect(table).not.toBeNull();
    expect(table.classList).toContain('visually-hidden');
    expect(table.textContent).toContain('Meter results chart data');
    expect(table.textContent).toContain('Month');
    expect(table.textContent).toContain('Total Energy (MMBtu)');
    expect(table.textContent).toContain('Total Cost (USD)');
    expect(table.textContent).toContain('Jan 2026');
    expect(table.textContent).toContain('$20.00');
  });

  it('downloads the rendered chart as a PNG through the ECharts directive', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const chartDirective = component.chartDirective as unknown as EChartsStubDirective;

    component.downloadPng();

    expect(chartDirective.downloadPng).toHaveBeenCalledWith('meter-results-chart');
  });

  it('flattens the bottom corners when joined to a following section', () => {
    const fixture = setup();

    fixture.componentRef.setInput('joinsFollowingSection', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.v1-meter-results-chart')?.classList)
      .toContain('v1-meter-results-chart--joins-following');
  });
});

@Directive({
  selector: '[appV1ECharts]',
  standalone: true,
  providers: [{ provide: EChartsChartDirective, useExisting: forwardRef(() => EChartsStubDirective) }]
})
class EChartsStubDirective {
  @Input('appV1ECharts') option?: V1EChartsOption;
  @Output() dataZoomChanged = new EventEmitter<V1EChartsDataZoomRange>();
  readonly downloadPng = vi.fn();
}

function setup(): ComponentFixture<MeterResultsChartComponent> {
  TestBed.overrideComponent(MeterResultsChartComponent, {
    remove: { imports: [EChartsChartDirective] },
    add: { imports: [EChartsStubDirective] }
  });
  TestBed.configureTestingModule({
    imports: [MeterResultsChartComponent]
  });
  const fixture = TestBed.createComponent(MeterResultsChartComponent);
  fixture.componentRef.setInput('chartRows', [
    { periodKey: '2026-0', periodLabel: 'Jan 2026', sortValue: 1, values: { utility: 10, cost: 20, emissions: 1 } },
    { periodKey: '2026-1', periodLabel: 'Feb 2026', sortValue: 2, values: { utility: 12, cost: 24, emissions: 2 } },
    { periodKey: '2026-2', periodLabel: 'Mar 2026', sortValue: 3, values: { utility: 14, cost: 28, emissions: 3 } }
  ]);
  fixture.componentRef.setInput('metrics', [
    { id: 'utility', label: 'Total Energy', unit: 'MMBtu' },
    { id: 'cost', label: 'Total Cost', currency: true },
    { id: 'emissions', label: 'Total Emissions', unit: 'tonne CO2e' }
  ]);
  fixture.componentRef.setInput('defaultLeftMetricId', 'utility');
  fixture.componentRef.setInput('defaultRightMetricId', 'cost');
  fixture.detectChanges();
  return fixture;
}

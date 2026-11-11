import { Directive, Input, forwardRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataQualityReportHistogramComponent } from './data-quality-report-histogram.component';

@Directive({ selector: '[appV1ECharts]', standalone: true,
  providers: [{ provide: EChartsChartDirective, useExisting: forwardRef(() => ChartStub) }] })
class ChartStub {
  @Input('appV1ECharts') option?: V1EChartsOption;
  readonly downloadPng = vi.fn();
}
function setup(values: readonly unknown[] = [0, 1, 2, 3, 4, 5]) {
  TestBed.configureTestingModule({ declarations: [DataQualityReportHistogramComponent], imports: [ReactiveFormsModule, ChartStub, IconComponent] });
  const fixture = TestBed.createComponent(DataQualityReportHistogramComponent);
  for (const [key, value] of Object.entries({ values, idPrefix: 'test-distribution', heading: 'Distribution of Total Consumption',
    metric: 'Total Consumption', unit: 'MMBtu', chartFileName: 'meter-distribution' })) fixture.componentRef.setInput(key, value);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, root: fixture.nativeElement as HTMLElement };
}
describe('Data Quality histogram controls', () => {
  it('defaults to 50, emits typed edits, hydrates silently, and updates bin size and frequencies', () => {
    const { fixture, component, root } = setup(), changes = vi.fn(); component.numberOfBinsChange.subscribe(changes);
    expect(component.binCount.value).toBe(50); expect(root.textContent).toContain('Bin Size: 1');
    component.binCount.setValue(2); expect(changes).toHaveBeenCalledExactlyOnceWith(2);
    fixture.componentRef.setInput('numberOfBins', 2); fixture.detectChanges();
    expect(changes).toHaveBeenCalledOnce(); expect(root.textContent).toContain('Bin Size: 3');
    expect(component.bins().map(bin => bin.count)).toEqual([3, 3]);
    const option = component.chartOption() as Record<string, any>;
    expect(option.xAxis).toMatchObject({ type: 'value', min: 0, max: 6, name: 'Total Consumption (MMBtu)' });
    expect(option.xAxis.axisLabel.formatter(3)).toBe('3');
    expect(option.series[0].data).toEqual([[1.5, 3], [4.5, 3]]);
    const tooltip = document.createElement('div'); tooltip.innerHTML = option.tooltip.formatter({ dataIndex: 0 });
    expect(tooltip.textContent).toBe('Range: 0 – 3Frequency: 3');
    expect(option.dataZoom).toEqual([{ type: 'inside', start: 0, end: 100 }]);
    component.downloadChart();
    expect(fixture.debugElement.query(By.directive(ChartStub)).injector.get(ChartStub).downloadPng).toHaveBeenCalledWith('meter-distribution');
  });
  it.each([null, 0, -1, 2.5, NaN, 1001])('keeps the last valid chart for invalid input %s', value => {
    const { fixture, component, root } = setup(), changes = vi.fn(); component.numberOfBinsChange.subscribe(changes);
    const original = component.chartOption(); component.binCount.setValue(value); fixture.detectChanges();
    expect(component.binCount.invalid).toBe(true); expect(root.querySelector('[role="alert"]')).not.toBeNull();
    expect(component.chartOption()).toBe(original); expect(changes).not.toHaveBeenCalled();
  });
  it.each([{ values: [] }, { values: [null, NaN, Infinity] }])('shows an empty state without a chart for $values', ({ values }) => {
    const { root } = setup(values); expect(root.textContent).toContain('No usable numeric readings');
    expect(root.querySelector('[role="img"]')).toBeNull(); expect(root.querySelector<HTMLButtonElement>('button')!.disabled).toBe(true);
  });
  it('provides constant-data chart frequencies and accessible bounds', () => {
    const { component, root } = setup([5, 5, 5]);
    expect(component.bins().map(bin => bin.count)).toEqual([3]);
    expect(root.querySelector('table')!.textContent).toContain('Lower bound (inclusive)');
  });
  it.each([1000000, 1e15])('keeps adjacent %s bin labels distinct without a redundant single-series legend', min => {
    const { component } = setup([min, min + 1, min + 2]);
    expect(new Set(component.bins().map(bin => bin.label)).size).toBe(2);
    if (min === 1000000) expect(component.bins()[0].label).toBe('1,000,000 – 1,000,001');
    expect((component.chartOption() as Record<string, any>).legend.show).toBe(false);
  });
  it('keeps single-value extreme constants safe with a numeric label', () => {
    const { component } = setup([Number.MAX_VALUE, Number.MAX_VALUE]);
    const option = component.chartOption() as Record<string, any>;
    expect(option.xAxis.type).toBe('category'); expect(option.xAxis.data).toHaveLength(1);
    expect(option.xAxis.data[0]).not.toContain(' – '); expect(option.series[0].data).toEqual([2]);
  });
});

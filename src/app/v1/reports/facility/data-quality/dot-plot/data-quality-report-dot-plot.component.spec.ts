import { Directive, Input, forwardRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { buildMeterDataQualityReport } from '@domain/calculations/data-quality/meter-data-quality';
import { buildPredictorDataQualityReport } from '@domain/calculations/data-quality/predictor-data-quality';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { dataQualityPdfSnapshot } from '../testing/data-quality-report-test-fixtures';
import { DataQualityReportDotPlotComponent } from './data-quality-report-dot-plot.component';
import { dataQualityDotPlotView, meterDotPlotInput, predictorDotPlotInput } from './data-quality-report-dot-plot.view';

function meter(values: readonly number[]) {
  const base = dataQualityPdfSnapshot().results.meters[0];
  return buildMeterDataQualityReport(values.map((value, index) => ({ ...base.meterData[0],
    guid: `reading-${index}`, month: index % 12 + 1, totalEnergyUse: value, totalCost: value * 2
  })), base.meter);
}

describe('Data Quality dot plot presentation', () => {
  it('preserves every finite reading and existing meter flags while stacking repeated values', () => {
    const report = meter([10, 10, 10, 100]), before = structuredClone(report);
    const view = dataQualityDotPlotView(meterDotPlotInput(report, 'consumption'));
    expect(view.points.map(point => [point.value, point.level])).toEqual([[10, 1], [10, 2], [10, 3], [100, 1]]);
    expect(view.points.filter(point => point.outlier)).toHaveLength(report.energyOutlierCount);
    expect(view.points.at(-1)!.outlier).toBe(true);
    expect(view.summary).toContain('Expected range: 10 to 10');
    expect(report).toEqual(before);
  });

  it('retains currency, negative values, zero, and the existing expected bounds', () => {
    const report = meter([-20, -10, 0, 10, 200]);
    const input = meterDotPlotInput(report, 'cost'), view = dataQualityDotPlotView(input);
    expect(view.points[0].valueLabel).toBe('$-40');
    expect(view.points.some(point => point.value === 0)).toBe(true);
    expect(view.points.filter(point => point.outlier)).toHaveLength(report.costOutlierCount);
    expect(view.rangeVisible).toBe(true);
    expect(view.chartOption!.series).toEqual(expect.arrayContaining([
      expect.objectContaining({ markArea: expect.objectContaining({
        data: [[{ xAxis: input.lower }, { xAxis: input.upper }]]
      }) })
    ]));
  });

  it('keeps finite predictor values with invalid months and reuses predictor outlier rules', () => {
    const base = dataQualityPdfSnapshot().results.predictors[0];
    const report = buildPredictorDataQualityReport(base.readings.map(row => ({ ...row, month: 0 })), base.predictor);
    const view = dataQualityDotPlotView(predictorDotPlotInput(report));
    expect(report.chartRows).toHaveLength(0);
    expect(view.points).toHaveLength(report.readings.length);
    expect(view.points.every(point => point.label === 'Unknown month')).toBe(true);
    expect(view.points.filter(point => point.outlier)).toHaveLength(report.outlierCount);
    expect(view.points.at(-1)!.outlier).toBe(true);
  });

  it('does not imply predictor outliers when the existing zero-MAD exception applies', () => {
    const base = dataQualityPdfSnapshot().results.predictors[0];
    const report = buildPredictorDataQualityReport(base.readings.map((row, index) => ({ ...row,
      amount: index === 4 ? 100 : 10 })), base.predictor);
    const input = predictorDotPlotInput(report), view = dataQualityDotPlotView(input);
    expect(report.statistics.medianAbsDev).toBe(0);
    expect(view.points.every(point => !point.outlier)).toBe(true);
    expect(view.rangeVisible).toBe(false);
    expect(input.notice).toContain('MAD is zero');
  });

  it.each([0, -12, 1e-9])('renders constant values %s with a usable scale', value => {
    const view = dataQualityDotPlotView(meterDotPlotInput(meter([value, value, value]), 'consumption'));
    expect(view.chartOption).toBeDefined();
    const axis = view.chartOption!.xAxis as { min: number; max: number };
    expect(axis.min).toBeLessThan(value); expect(axis.max).toBeGreaterThan(value);
    expect(view.points.map(point => point.level)).toEqual([1, 2, 3]);
    if (value === 1e-9) expect(view.points[0].valueLabel).toContain('E-9');
  });

  it('handles empty/invalid inputs and an unrepresentable numeric span without a broken chart', () => {
    expect(dataQualityDotPlotView(meterDotPlotInput(meter([NaN, Infinity]), 'consumption')))
      .toMatchObject({ chartOption: undefined, points: [], message: expect.stringContaining('No usable') });
    expect(dataQualityDotPlotView(meterDotPlotInput(meter([-Number.MAX_VALUE, Number.MAX_VALUE]), 'consumption')))
      .toMatchObject({ chartOption: undefined, message: expect.stringContaining('cannot be displayed') });
  });

  it('keeps large repeated sets and provides vertical zoom without changing their values', () => {
    const view = dataQualityDotPlotView(meterDotPlotInput(meter(Array(100).fill(10)), 'consumption'));
    expect(view.points).toHaveLength(100);
    expect(view.points.at(-1)!.level).toBe(100);
    expect(view.chartOption!.dataZoom).toEqual(expect.arrayContaining([
      expect.objectContaining({ orient: 'vertical', yAxisIndex: 0 })
    ]));
  });

  it('escapes hover text and displays the reading value once', () => {
    const view = dataQualityDotPlotView({ ...meterDotPlotInput(meter([10]), 'consumption'),
      metric: '<metric>', unit: 'kWh' });
    const formatter = (view.chartOption!.tooltip as { formatter: (params: unknown) => string }).formatter;
    const tooltip = formatter({ data: { reading: { label: '<date>', value: 10, outlier: false } } });
    expect(tooltip).toContain('&lt;date&gt;'); expect(tooltip).toContain('&lt;metric&gt;');
    expect(tooltip.match(/10 kWh/g)).toHaveLength(1);
  });
});

@Directive({ selector: '[appV1ECharts]', standalone: true,
  providers: [{ provide: EChartsChartDirective, useExisting: forwardRef(() => ChartStub) }] })
class ChartStub {
  @Input('appV1ECharts') option?: V1EChartsOption;
  readonly downloadPng = vi.fn();
}

describe('Data Quality dot plot component', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('provides accessible readings and PNG download, then clears the chart for unusable data', async () => {
    await TestBed.configureTestingModule({ declarations: [DataQualityReportDotPlotComponent],
      imports: [ChartStub, IconComponent] }).compileComponents();
    const fixture = TestBed.createComponent(DataQualityReportDotPlotComponent);
    fixture.componentRef.setInput('data', meterDotPlotInput(meter([10, 10, 100]), 'consumption'));
    fixture.componentRef.setInput('heading', 'Consumption distribution');
    fixture.componentRef.setInput('idPrefix', 'consumption');
    fixture.componentRef.setInput('chartFileName', 'meter-dot-plot'); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(root.querySelector('[role="img"]')!.getAttribute('aria-describedby')).toBe('consumption-summary');
    const chart = fixture.debugElement.query(By.directive(ChartStub)).injector.get(ChartStub);
    root.querySelector<HTMLButtonElement>('button')!.click();
    expect(chart.downloadPng).toHaveBeenCalledWith('meter-dot-plot');
    fixture.componentRef.setInput('data', meterDotPlotInput(meter([]), 'consumption')); fixture.detectChanges();
    expect(root.querySelector('[role="img"]')).toBeNull();
    expect(root.querySelector<HTMLButtonElement>('button')!.disabled).toBe(true);
    expect(root.textContent).toContain('No usable numeric readings');
  });
});

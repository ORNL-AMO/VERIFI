import { Directive, Input, forwardRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MonthlyData } from '@data/models/calanderization';
import { EChartsChartDirective, V1EChartsOption } from '@app/v1/shared/charts/echarts-chart.directive';
import { vi } from 'vitest';
import {
  MeterFiscalYearComparisonChartComponent,
  buildMeterFiscalYearComparisonData
} from './meter-fiscal-year-comparison-chart.component';

describe('MeterFiscalYearComparisonChartComponent', () => {
  it('builds one fiscal-year line per year and leaves missing months as gaps', () => {
    const data = buildMeterFiscalYearComparisonData([
      monthlyData({ year: 2025, fiscalYear: 2025, monthNumValue: 0, energyUse: 10, energyCost: 0 }),
      monthlyData({ year: 2025, fiscalYear: 2025, monthNumValue: 2, energyUse: 30, energyCost: 0 }),
      monthlyData({ year: 2026, fiscalYear: 2026, monthNumValue: 0, energyUse: 12, energyCost: 0 })
    ], utilityMetric, costMetric, 0, false);

    expect(data.monthLabels).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
    expect(data.hasCost).toBe(false);
    expect(data.series.map(series => series.label)).toEqual(['2025', '2026']);
    expect(data.series[0].utilityValues.slice(0, 3)).toEqual([10, null, 30]);
    expect(data.series[1].utilityValues.slice(0, 3)).toEqual([12, null, null]);
  });

  it('renders utility and cost as stacked panels with one linked fiscal-month axis', () => {
    const fixture = setup([
      monthlyData({ year: 2025, fiscalYear: 2026, monthNumValue: 6, energyUse: 10, energyCost: 100 }),
      monthlyData({ year: 2025, fiscalYear: 2026, monthNumValue: 7, energyUse: 12, energyCost: 120 }),
      monthlyData({ year: 2026, fiscalYear: 2027, monthNumValue: 6, energyUse: 14, energyCost: 140 })
    ], 6, true);
    const component = fixture.componentInstance;
    const option = component.chartOption() as Record<string, any>;

    expect(component.comparison().monthLabels).toEqual(['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']);
    expect(component.comparison().series.map(series => series.label)).toEqual(['FY 2026', 'FY 2027']);
    expect(component.comparison().hasCost).toBe(true);
    expect(option.grid).toHaveLength(2);
    expect(option.xAxis).toHaveLength(2);
    expect(option.xAxis[0].data).toEqual(option.xAxis[1].data);
    expect(option.axisPointer).toEqual({ link: [{ xAxisIndex: 'all' }] });
    expect(option.yAxis[0].axisLabel).toEqual({ show: true });
    expect(option.yAxis[1].axisLabel).toEqual({ show: true, formatter: '${value}' });
    expect(option.series.map((series: { name: string; xAxisIndex: number }) => [series.name, series.xAxisIndex])).toEqual([
      ['FY 2026', 0],
      ['FY 2027', 0],
      ['FY 2026', 1],
      ['FY 2027', 1]
    ]);
    expect(option.series[0].lineStyle.color).toBe(option.series[2].lineStyle.color);
    expect(fixture.nativeElement.querySelector('.v1-meter-fiscal-comparison__chart--stacked')).not.toBeNull();
  });

  it('uses a unique color for each of the first 15 fiscal years', () => {
    const rows = Array.from({ length: 15 }, (_, index) => monthlyData({
      year: 2010 + index,
      fiscalYear: 2010 + index,
      energyUse: 100 + index,
      energyCost: 10 + index
    }));
    const fixture = setup(rows);
    const option = fixture.componentInstance.chartOption() as Record<string, any>;
    const utilitySeries = option.series.slice(0, 15) as Array<{ lineStyle: { color: string } }>;
    const costSeries = option.series.slice(15) as Array<{ lineStyle: { color: string } }>;
    const utilityColors = utilitySeries.map(series => series.lineStyle.color);

    expect(new Set(utilityColors).size).toBe(15);
    expect(costSeries.map(series => series.lineStyle.color)).toEqual(utilityColors);
  });

  it('keeps the accessible table and downloads the combined chart', () => {
    const fixture = setup([
      monthlyData({ fiscalYear: 2026, monthNumValue: 0, energyUse: 10, energyCost: 100 })
    ]);
    const component = fixture.componentInstance;
    const chartDirective = component.chartDirective as unknown as EChartsStubDirective;
    const accessibleData = fixture.nativeElement.querySelector('.v1-meter-fiscal-comparison__accessible-data') as HTMLDivElement;

    expect(accessibleData.classList).toContain('visually-hidden');
    expect(accessibleData.querySelector('table')?.textContent).toContain('2026 Total Energy (MMBtu)');
    expect(accessibleData.querySelector('table')?.textContent).toContain('2026 Total Cost (USD)');

    component.downloadPng();

    expect(chartDirective.downloadPng).toHaveBeenCalledWith('meter-monthly-fiscal-year-comparison');
  });
});

@Directive({
  selector: '[appV1ECharts]',
  standalone: true,
  providers: [{ provide: EChartsChartDirective, useExisting: forwardRef(() => EChartsStubDirective) }]
})
class EChartsStubDirective {
  @Input('appV1ECharts') option?: V1EChartsOption;
  readonly downloadPng = vi.fn();
}

const utilityMetric = { id: 'energyUse', label: 'Total Energy', unit: 'MMBtu' };
const costMetric = { id: 'energyCost', label: 'Total Cost', currency: true };

function setup(
  rows: readonly MonthlyData[],
  fiscalYearStartMonth = 0,
  usesFiscalYearLabels = false
): ComponentFixture<MeterFiscalYearComparisonChartComponent> {
  TestBed.overrideComponent(MeterFiscalYearComparisonChartComponent, {
    remove: { imports: [EChartsChartDirective] },
    add: { imports: [EChartsStubDirective] }
  });
  TestBed.configureTestingModule({
    imports: [MeterFiscalYearComparisonChartComponent]
  });
  const fixture = TestBed.createComponent(MeterFiscalYearComparisonChartComponent);
  fixture.componentRef.setInput('monthlyRows', rows);
  fixture.componentRef.setInput('utilityMetric', utilityMetric);
  fixture.componentRef.setInput('costMetric', costMetric);
  fixture.componentRef.setInput('fiscalYearStartMonth', fiscalYearStartMonth);
  fixture.componentRef.setInput('usesFiscalYearLabels', usesFiscalYearLabels);
  fixture.detectChanges();
  return fixture;
}

function monthlyData(options: Partial<MonthlyData> = {}): MonthlyData {
  return {
    month: 'January',
    monthNumValue: 0,
    year: 2026,
    fiscalYear: 2026,
    energyConsumption: 10,
    energyUse: 20,
    energyCost: 30,
    date: new Date(2026, 0, 1),
    readingType: 'metered',
    RECs: 0,
    locationElectricityEmissions: 0,
    marketElectricityEmissions: 0,
    otherScope2Emissions: 0,
    scope2LocationEmissions: 0,
    scope2MarketEmissions: 0,
    excessRECs: 0,
    excessRECsEmissions: 0,
    mobileCarbonEmissions: 0,
    mobileBiogenicEmissions: 0,
    mobileOtherEmissions: 0,
    mobileTotalEmissions: 0,
    fugitiveEmissions: 0,
    processEmissions: 0,
    stationaryBiogenicEmmissions: 0,
    stationaryCarbonEmissions: 0,
    stationaryOtherEmissions: 0,
    stationaryEmissions: 0,
    totalScope1Emissions: 0,
    totalWithMarketEmissions: 0,
    totalWithLocationEmissions: 0,
    totalBiogenicEmissions: 0,
    ...options
  };
}

import { TestBed } from '@angular/core/testing';
import { AnalysisGroup } from '@data/models/analysis';
import { AnalysisChartsModule } from '../chart/analysis-charts.module';
import { AnalysisModelComparisonChartComponent } from './analysis-model-comparison-chart.component';
import { AnalysisModelComparisonData, analysisModelComparisonChart } from './analysis-model-comparison-chart.view';

describe('shared Analysis model comparison', () => {
  it('uses Analysis scatter/line series, fiscal model shading and matching accessible values', () => {
    TestBed.configureTestingModule({ imports: [AnalysisChartsModule] });
    const fixture = TestBed.createComponent(AnalysisModelComparisonChartComponent);
    const data: AnalysisModelComparisonData = { source: 'generated', modelYear: 2024,
      group: {} as AnalysisGroup, category: 'water', unit: 'kgal',
      monthly: [
        { date: new Date(2023, 5, 1), fiscalYear: 2023, energyUse: 10, modeledEnergy: 12 },
        { date: new Date(2023, 6, 1), fiscalYear: 2024, energyUse: 13, modeledEnergy: null }
      ] };
    fixture.componentRef.setInput('data', data); fixture.detectChanges();
    const option = fixture.componentInstance.option() as any;
    expect(option.series.map((series: any) => [series.name, series.type])).toEqual([['Actual consumption', 'scatter'], ['Modeled consumption', 'line']]);
    expect(option.series[1].data).toEqual([12, null]);
    expect(option.series[1].markArea.data).toEqual([[{ xAxis: 1 }, { xAxis: 1 }]]);
    expect(fixture.componentInstance.accessibleRows().map(row => row.model)).toEqual([false, true]);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('caption')?.textContent).toContain('Model comparison data (kgal)');
    expect(root.querySelector('tbody')?.textContent).toContain('—');

    fixture.componentRef.setInput('data', { ...data, monthly: [] }); fixture.detectChanges();
    expect(root.querySelector('[role=status]')?.textContent).toContain('No model comparison data');
  });

  it('retains user-defined model dates and compares selected models by month', () => {
    const data: AnalysisModelComparisonData = { source: 'user-defined', modelYear: undefined,
      group: { regressionStartYear: 2023, regressionModelStartMonth: 6, regressionEndYear: 2023, regressionModelEndMonth: 7 } as AnalysisGroup,
      category: 'energy', unit: 'MMBtu',
      monthly: [
        { date: new Date(2023, 6, 1), fiscalYear: 2024, energyUse: 100, modeledEnergy: 110 },
        { date: new Date(2023, 7, 1), fiscalYear: 2024, energyUse: 120, modeledEnergy: 130 }
      ], comparison: { monthly: [{ date: new Date(2023, 6, 15), fiscalYear: 2024, energyUse: 100, modeledEnergy: 115 }] } };
    const option = analysisModelComparisonChart(data) as any;
    expect(option.series[1].markArea.data).toEqual([[{ xAxis: 0 }, { xAxis: 1 }]]);
    expect(option.series[2].data).toEqual([115, null]);
    expect(analysisModelComparisonChart({ ...data, monthly: [] })).toBeUndefined();
  });
});

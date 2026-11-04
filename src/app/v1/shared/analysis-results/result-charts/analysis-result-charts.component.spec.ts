import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { AnalysisChartsModule } from '../chart/analysis-charts.module';
import { annualResultChartsView, monthlyResultChartsView, MONTHLY_USE_COMPARISON_BAND } from '../chart/analysis-result-chart.view';
import { AnalysisResultChartsComponent } from './analysis-result-charts.component';

describe('shared Analysis charts', () => {
  it('uses Analysis annual bars and labels, then monthly comparison shading and stacked savings bars', () => {
    TestBed.configureTestingModule({ imports: [AnalysisChartsModule] });
    const fixture = TestBed.createComponent(AnalysisResultChartsComponent);
    const annual = [{ year: 2024, energyUse: 100, adjusted: 120, annualSavingsPercentImprovement: 4, totalSavingsPercentImprovement: 6 }] as AnnualAnalysisSummary[];
    fixture.componentRef.setInput('view', annualResultChartsView(annual, 'water', 'kgal'));
    fixture.componentRef.setInput('showChartActions', false);
    fixture.detectChanges();
    let charts = fixture.debugElement.queryAll(By.directive(MeterResultsChartComponent)).map(child => child.componentInstance as MeterResultsChartComponent);
    expect(charts[0].defaultLeftDisplay).toBe('bar');
    expect(charts[0].defaultRightDisplay).toBe('bar');
    expect(charts[0].showValueLabels).toBe(true);
    expect(charts[0].compactValueLabels).toBe(true);
    expect(charts[0].yAxisTitle).toBe('Consumption (kgal)');
    expect(charts[1].defaultLeftMetricId).toBe('annualImprovement');
    expect(charts[1].defaultRightMetricId).toBe('totalImprovement');
    expect(charts[1].yAxisTitle).toBe('Percent Improvement');
    expect(charts.every(chart => !chart.showChartActions)).toBe(true);
    expect(charts.every(chart => !chart.deferUntilVisible)).toBe(true);

    const monthly = [{ date: new Date(2024, 0, 1), fiscalYear: 2024, energyUse: 100, adjusted: 120, rolling12MonthImprovement: -2 }] as MonthlyAnalysisSummaryData[];
    fixture.componentRef.setInput('view', monthlyResultChartsView(monthly, monthly, 'energy', 'MMBtu', false));
    fixture.componentRef.setInput('deferUntilVisible', true);
    fixture.detectChanges();
    charts = fixture.debugElement.queryAll(By.directive(MeterResultsChartComponent)).map(child => child.componentInstance as MeterResultsChartComponent);
    expect(charts[0].showAllMetrics).toBe(true);
    expect(charts[0].allMetricsDisplay).toBe('line');
    expect(charts[0].comparisonBand).toEqual(MONTHLY_USE_COMPARISON_BAND);
    expect(charts[0].yAxisTitle).toBe('MMBtu');
    expect(charts[1].allMetricsDisplay).toBe('bar');
    expect(charts[1].stackSeries).toBe(true);
    expect(charts[1].yAxisTitle).toBe('Percent Savings');
    expect(charts[1].chartRows[0].values['losses']).toBe(-2);
    expect(charts.every(chart => chart.deferUntilVisible)).toBe(true);
  });
});

import { annualImprovementChartRows, annualUseChartRows, monthlySavingsChartView, monthlyUseChartRows } from './analysis-result-chart.view';

describe('analysis result chart views', () => {
  it('preserves zero, negative, and transition values without rounding', () => {
    expect(annualUseChartRows([{ year: 2024, energyUse: 0, adjusted: -2 } as any])[0].values)
      .toEqual({ actual: 0, calculated: -2 });
    const transition = { year: 2024, energyUse: 200, adjusted: 190, isIntermediateBanked: true, annualSavingsPercentImprovement: 2, totalSavingsPercentImprovement: 8 } as any;
    expect(annualImprovementChartRows([transition])[0].values).toEqual({ annualImprovement: null, totalImprovement: 8 });
    expect(monthlyUseChartRows([{ date: new Date(2024, 0, 1), energyUse: 20, adjusted: 19, isIntermediateBanked: true } as any])[0].values)
      .toEqual({ actual: 20, calculated: null });
  });

  it('keeps account savings and losses in aggregate series when banking splits are disabled', () => {
    const view = monthlySavingsChartView([
      { date: new Date(2025, 0, 1), rolling12MonthImprovement: 4, isBanked: true } as any,
      { date: new Date(2025, 1, 1), rolling12MonthImprovement: -3, isBanked: false } as any
    ], false);
    expect(view.metrics.map(metric => metric.id)).toEqual(['losses', 'savings']);
    expect(view.rows.map(row => row.values)).toEqual([{ savings: 4, losses: 0 }, { savings: 0, losses: -3 }]);
  });
});

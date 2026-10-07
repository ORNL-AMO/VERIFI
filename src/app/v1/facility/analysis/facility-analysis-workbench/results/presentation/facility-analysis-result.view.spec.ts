import {
  annualUseChartRows,
  facilityGroupContributionsView,
  monthlySavingsChartView,
  monthlyUseChartRows
} from './facility-analysis-result.view';

describe('facility analysis result views', () => {
  it('keeps zero and negative annual values in chart projections', () => {
    expect(annualUseChartRows([{ year: 2024, energyUse: 0, adjusted: -2 } as any])).toEqual([{
      periodKey: '2024', periodLabel: '2024', sortValue: 2024,
      values: { actual: 0, calculated: -2 }
    }]);
  });

  it('projects facility group contributions by year with v0 percentages at full precision', () => {
    const view = facilityGroupContributionsView(
      [
        { year: 2023, adjusted: 900, savings: 0, totalSavingsPercentImprovement: 0 },
        { year: 2024, adjusted: 1000, savings: 100.5, totalSavingsPercentImprovement: 10.05 },
        { year: 2025, adjusted: 0, savings: 8, totalSavingsPercentImprovement: 2 }
      ] as any,
      [
        {
          group: { idbGroupId: 'electric', analysisType: 'regression' },
          annualAnalysisSummaryData: [
            { year: 2024, savings: 125.5, totalSavingsPercentImprovement: 12.55 },
            { year: 2025, savings: 8, totalSavingsPercentImprovement: 2 }
          ]
        },
        {
          group: { idbGroupId: 'gas', analysisType: 'absoluteConsumption' },
          annualAnalysisSummaryData: [{ year: 2024, savings: -25, totalSavingsPercentImprovement: -5 }]
        },
        {
          group: { idbGroupId: 'skipped', analysisType: 'skip' },
          annualAnalysisSummaryData: [{ year: 2024, savings: 999, totalSavingsPercentImprovement: 99 }]
        }
      ] as any,
      new Map([['electric', 'Electricity'], ['gas', 'Natural Gas']])
    );

    expect(view.years).toEqual([
      {
        year: 2024,
        totalSavings: 100.5,
        totalSavingsPercent: 10.05,
        totalContributionPercent: 10.05,
        groups: [
          { groupId: 'electric', groupName: 'Electricity', savings: 125.5, savingsPercent: 12.55, contributionPercent: 12.55 },
          { groupId: 'gas', groupName: 'Natural Gas', savings: -25, savingsPercent: -5, contributionPercent: -2.5 }
        ]
      },
      {
        year: 2025,
        totalSavings: 8,
        totalSavingsPercent: 2,
        totalContributionPercent: 0,
        groups: [
          { groupId: 'electric', groupName: 'Electricity', savings: 8, savingsPercent: 2, contributionPercent: 0 },
          { groupId: 'gas', groupName: 'Natural Gas', savings: 0, savingsPercent: 0, contributionPercent: 0 }
        ]
      }
    ]);
    expect(view.groups).toEqual([
      { groupId: 'electric', groupName: 'Electricity' },
      { groupId: 'gas', groupName: 'Natural Gas' }
    ]);
  });

  it('projects v0 monthly actual and calculated use without rounding', () => {
    const date = new Date(2025, 0, 1);
    expect(monthlyUseChartRows([{ date, energyUse: 1.234567, adjusted: 2.345678 } as any])[0])
      .toMatchObject({ sortValue: date.getTime(), values: { actual: 1.234567, calculated: 2.345678 } });
  });

  it('splits rolling improvement into the v0 savings and losses series', () => {
    const rows = [
      { date: new Date(2025, 0, 1), rolling12MonthImprovement: 4.25, isBanked: true },
      { date: new Date(2025, 1, 1), rolling12MonthImprovement: -1.5, isBanked: false }
    ] as any;

    expect(monthlySavingsChartView(rows, false).rows.map(row => row.values)).toEqual([
      { savings: 4.25, losses: 0 },
      { savings: 0, losses: -1.5 }
    ]);
  });

  it('preserves the v0 banked monthly savings projection', () => {
    const rows = [
      {
        date: new Date(2025, 0, 1), rolling12MonthImprovement: 3, isBanked: true,
        isIntermediateBanked: false, percentSavingsComparedToBaseline: 5
      },
      {
        date: new Date(2025, 1, 1), rolling12MonthImprovement: -2, isBanked: false,
        isIntermediateBanked: true, percentSavingsComparedToBaseline: 6
      }
    ] as any;

    const view = monthlySavingsChartView(rows, true);

    expect(view.metrics.map(metric => metric.label)).toEqual([
      'Banked Savings', 'Banked Losses', 'Savings', 'Losses'
    ]);
    expect(view.rows.map(row => row.values)).toEqual([
      { savings: 0, losses: 0, bankedSavings: 3, bankedLosses: 0 },
      { savings: 0, losses: -2, bankedSavings: 5, bankedLosses: -2 }
    ]);
  });

  it.each([
    {
      label: 'energy regression output',
      annual: { year: 2025, energyUse: 987654.3210987, adjusted: 1023456.7890123, savings: 35802.4679136 },
      expected: { actual: 987654.3210987, calculated: 1023456.7890123 }
    },
    {
      label: 'water absolute-consumption output',
      annual: { year: 2024, energyUse: 0.00000125, adjusted: 0.0000015, savings: 0.00000025 },
      expected: { actual: 0.00000125, calculated: 0.0000015 }
    }
  ])('matches representative v0 $label values at full precision', ({ annual, expected }) => {
    expect(annualUseChartRows([annual as any])[0].values).toEqual(expected);
  });
});

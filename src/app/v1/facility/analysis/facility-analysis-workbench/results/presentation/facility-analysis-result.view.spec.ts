import { annualUseChartRows, monthlyChartRows } from './facility-analysis-result.view';

describe('facility analysis result views', () => {
  it('keeps zero and negative annual values in chart projections', () => {
    expect(annualUseChartRows([{ year: 2024, energyUse: 0, adjusted: -2 } as any])).toEqual([{
      periodKey: '2024', periodLabel: '2024', sortValue: 2024,
      values: { actual: 0, calculated: -2 }
    }]);
  });

  it('orders monthly chart rows by their original dates without rounding', () => {
    const date = new Date(2025, 0, 1);
    expect(monthlyChartRows([{ date, energyUse: 1.234567, modeledEnergy: 2.345678, savings: -0.25 } as any])[0])
      .toMatchObject({ sortValue: date.getTime(), values: { actual: 1.234567, modeled: 2.345678, savings: -0.25 } });
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

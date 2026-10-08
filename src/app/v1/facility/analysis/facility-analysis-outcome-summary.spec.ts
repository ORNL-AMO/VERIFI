import { facilityAnalysisOutcomeDisplay, facilityAnalysisOutcomeSummary } from './facility-analysis-outcome-summary';

describe('facilityAnalysisOutcomeSummary', () => {
  it('uses the report year and the newest available monthly row', () => {
    const summary = facilityAnalysisOutcomeSummary([
      { year: 2024, totalSavingsPercentImprovement: 2.5 },
      { year: 2025, totalSavingsPercentImprovement: -1.25 }
    ] as any, [
      { date: new Date(2026, 0, 1), rolling12MonthImprovement: 3.2 },
      { date: new Date(2026, 2, 1), rolling12MonthImprovement: 0 }
    ] as any, 2025, { fiscalYear: 'nonCalendarYear' } as any);

    expect(summary).toEqual({
      annual: { periodLabel: 'FY 2025', value: -1.25 },
      monthly: { periodLabel: 'Mar 2026', value: 0 }
    });
  });

  it('uses a calendar-year label without the fiscal-year prefix', () => {
    const summary = facilityAnalysisOutcomeSummary([
      { year: 2025, totalSavingsPercentImprovement: 4 }
    ] as any, [], 2025, { fiscalYear: 'calendarYear' } as any);

    expect(summary.annual).toEqual({ periodLabel: '2025', value: 4 });
  });

  it('reports incomplete and non-finite values instead of presenting zero', () => {
    const summary = facilityAnalysisOutcomeSummary([
      { year: 2025, totalSavingsPercentImprovement: 0, missingPredictorValue: true }
    ] as any, [
      { date: new Date(2025, 11, 1), rolling12MonthImprovement: Number.NaN, missingValueWarning: false }
    ] as any, 2025, { fiscalYear: 'calendarYear' } as any);

    expect(summary.annual).toEqual({ periodLabel: '2025', unavailableMessage: 'Incomplete data' });
    expect(summary.monthly).toEqual({ periodLabel: 'Dec 2025', unavailableMessage: 'Unavailable' });
  });

  it('distinguishes absent complete years and months', () => {
    const summary = facilityAnalysisOutcomeSummary([], [], undefined, undefined);
    expect(summary).toEqual({
      annual: { periodLabel: 'Latest full year', unavailableMessage: 'No complete year' },
      monthly: { periodLabel: 'Latest month', unavailableMessage: 'No complete month' }
    });
    expect(facilityAnalysisOutcomeDisplay({ state: 'ready', summary }, 'energy')).toMatchObject({
      annual: { label: 'Latest full year', valueLabel: 'No complete year' },
      monthly: { label: 'Latest month', valueLabel: 'No complete month' }
    });
  });

  it('preserves zero and negative signs in display text without assigning a result tone', () => {
    const display = facilityAnalysisOutcomeDisplay({
      state: 'ready',
      summary: {
        annual: { periodLabel: 'FY 2025', value: -1.25 },
        monthly: { periodLabel: 'Sep 2026', value: 0 }
      }
    }, 'energy');

    expect(display.annual).toMatchObject({ valueLabel: '-1.25%', unavailable: false });
    expect(display.monthly).toMatchObject({ valueLabel: '0%', unavailable: false });
    expect(display.annual).not.toHaveProperty('tone');
  });
});

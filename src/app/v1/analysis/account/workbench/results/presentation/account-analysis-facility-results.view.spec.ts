import {
  accountFacilityContributionsView,
  accountFacilityDetailsView
} from './account-analysis-facility-results.view';

describe('account facility result views', () => {
  const names = new Map([['facility-a', 'North Plant'], ['facility-b', 'South Plant']]);
  const summaries = [
    { facilityGuid: 'facility-a', analysisGuid: 'analysis-a', monthlySummaryData: [monthly(2023, 0, 10, 100), monthly(2024, 0, 30, 300), monthly(2024, 1, -5, 100)] },
    { facilityGuid: 'facility-b', analysisGuid: 'analysis-b', monthlySummaryData: [monthly(2023, 0, 0, 100), monthly(2024, 0, -10, 200), monthly(2024, 1, 5, 200)] }
  ] as any;

  it('keeps full monthly facility rows and exposes latest-year savings and contribution for details cards', () => {
    const details = accountFacilityDetailsView(summaries, names, [{ year: 2024, adjusted: 1000 }] as any);
    expect(details[0]).toMatchObject({
      facilityGuid: 'facility-a', analysisGuid: 'analysis-a', facilityName: 'North Plant', latestRollingImprovement: 2.5,
      latestFiscalYear: 2024, latestFiscalYearSavings: 25, latestFiscalYearContributionPercent: 2.5
    });
    expect(details[0].monthlyRows.map(row => row.date.getMonth())).toEqual([0, 0, 1]);
  });

  it('projects fiscal-year facility savings and contributions without rounding', () => {
    const view = accountFacilityContributionsView([
      { year: 2023, adjusted: 800, savings: 0, totalSavingsPercentImprovement: 0 },
      { year: 2024, adjusted: 1000, savings: 20, totalSavingsPercentImprovement: 2 },
      { year: 2025, adjusted: 0, savings: 4, totalSavingsPercentImprovement: 1 }
    ] as any, summaries, names);
    expect(view.facilities.map(facility => facility.facilityName)).toEqual(['North Plant', 'South Plant']);
    expect(view.years).toEqual([
      { year: 2024, totalSavings: 20, totalSavingsPercent: 2, totalContributionPercent: 2, facilities: [
        { facilityGuid: 'facility-a', analysisGuid: 'analysis-a', facilityName: 'North Plant', savings: 25, savingsPercent: 6.25, contributionPercent: 2.5 },
        { facilityGuid: 'facility-b', analysisGuid: 'analysis-b', facilityName: 'South Plant', savings: -5, savingsPercent: -1.25, contributionPercent: -0.5 }
      ] },
      { year: 2025, totalSavings: 4, totalSavingsPercent: 1, totalContributionPercent: 0, facilities: [
        { facilityGuid: 'facility-a', analysisGuid: 'analysis-a', facilityName: 'North Plant', savings: 0, savingsPercent: 0, contributionPercent: 0 },
        { facilityGuid: 'facility-b', analysisGuid: 'analysis-b', facilityName: 'South Plant', savings: 0, savingsPercent: 0, contributionPercent: 0 }
      ] }
    ]);
  });
});

function monthly(year: number, month: number, savings: number, adjusted: number): any {
  return { date: new Date(year, month, 1), fiscalYear: year, savings, adjusted, rolling12MonthImprovement: month === 1 ? 2.5 : 1 };
}

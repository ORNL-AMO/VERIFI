import { AccountAnalysisResultsValue } from '@platform/web-workers/account-analysis-results-worker.contract';
import { projectAccountAnalysisDashboardResults } from './account-analysis-results-calculation';

describe('account analysis dashboard result projection', () => {
  it('keeps annual history through the report year and only the newest valid month', () => {
    const value = {
      itemId: 'analysis-a',
      reportYear: 2024,
      annualAnalysisSummaries: [{ year: 2023 }, { year: 2024 }, { year: 2025 }],
      monthlyAnalysisSummaryData: [
        { date: new Date('2024-01-01') },
        { date: new Date('invalid') },
        { date: new Date('2024-03-01') }
      ]
    } as unknown as AccountAnalysisResultsValue;

    const projected = projectAccountAnalysisDashboardResults(value);

    expect(projected.annualAnalysisSummaries.map(row => row.year)).toEqual([2023, 2024]);
    expect(projected.monthlyAnalysisSummaryData).toHaveLength(1);
    expect(new Date(projected.monthlyAnalysisSummaryData[0].date).getUTCMonth()).toBe(2);
  });

  it('preserves full numeric precision', () => {
    const precise = 12.345678901234;
    const value = {
      itemId: 'analysis-a', reportYear: 2024,
      annualAnalysisSummaries: [{ year: 2024, totalSavingsPercentImprovement: precise }],
      monthlyAnalysisSummaryData: []
    } as unknown as AccountAnalysisResultsValue;
    expect(projectAccountAnalysisDashboardResults(value).annualAnalysisSummaries[0].totalSavingsPercentImprovement)
      .toBe(precise);
  });
});

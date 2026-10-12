import { AnnualAnalysisSummary } from '@data/models/analysis';
import { AccountAnalysisDashboardCard, AccountAnalysisFacilitySelectionView } from '../account-analysis.models';
import {
  alignAnnualRows,
  buildAccountAnalysisComparisonView,
  compareSelections
} from './account-analysis-comparison.view';

describe('account analysis comparison view', () => {
  it('compares facility selections by GUID while displaying facility and analysis names', () => {
    const first = [selection('facility-a', 'Alpha', 'analysis-a', 'Alpha analysis')];
    const second = [selection('facility-a', 'Alpha renamed', 'analysis-b', 'Beta analysis')];
    expect(compareSelections(first, second)).toEqual([expect.objectContaining({
      facilityGuid: 'facility-a',
      facilityName: 'Alpha',
      firstValue: 'Alpha analysis',
      secondValue: 'Beta analysis',
      different: true
    })]);
  });

  it('aligns annual results by fiscal year', () => {
    const rows = alignAnnualRows([annual(2022), annual(2024)], [annual(2023), annual(2024)], 'fiscalYear');
    expect(rows.map(row => row.yearLabel)).toEqual(['FY 2022', 'FY 2023', 'FY 2024']);
    expect(rows[0].second).toBeUndefined();
    expect(rows[1].first).toBeUndefined();
  });

  it('requires matching units and basis only for actual-versus-adjusted charts', () => {
    const first = card('first', 'MMBtu', 'Source energy', [annual(2024)]);
    const second = card('second', 'kWh', 'Site energy', [annual(2024)]);
    const view = buildAccountAnalysisComparisonView(first, second, 'calendarYear');
    expect(view.useChartCompatible).toBe(false);
    expect(view.useChartUnavailableMessage).toContain('matching units and site/source basis');
    expect(view.improvementChartRows).toHaveLength(1);
    expect(view.improvementChartMetrics).toHaveLength(4);
  });

  it('surfaces each calculation state independently', () => {
    const first = { ...card('first', 'MMBtu', 'Source energy', []), outcome: { state: 'loading', message: 'Calculating…' } } as AccountAnalysisDashboardCard;
    const second = { ...card('second', 'MMBtu', 'Source energy', []), outcome: { state: 'error', message: 'Calculation failed' } } as AccountAnalysisDashboardCard;
    const view = buildAccountAnalysisComparisonView(first, second, 'calendarYear');
    expect(view.firstResultMessage).toBe('Calculating…');
    expect(view.secondResultMessage).toBe('Calculation failed');
  });
});

function selection(
  facilityGuid: string,
  facilityName: string,
  analysisGuid: string,
  analysisName: string
): AccountAnalysisFacilitySelectionView {
  return {
    facilityGuid,
    facilityName,
    facility: { guid: facilityGuid, name: facilityName } as any,
    analysis: { guid: analysisGuid, name: analysisName } as any,
    analysisName,
    state: 'included',
    detail: 'Included in account results'
  };
}

function card(
  guid: string,
  unitLabel: string,
  basisLabel: string,
  annualRows: readonly AnnualAnalysisSummary[]
): AccountAnalysisDashboardCard {
  return {
    analysis: { guid, name: guid, analysisCategory: 'energy', baselineYear: 2022 } as any,
    category: 'energy', status: 'ready', statusLabel: 'Ready', findings: [], isActiveForReporting: false,
    linkedReports: [], facilitySelections: [], selectionCounts: { included: 0, skipped: 0, missing: 0, invalid: 0 },
    basisLabel, unitLabel, modifiedDateLabel: '', modifiedSortValue: 0, searchText: guid, attentionRank: 3,
    outcome: {
      state: 'ready', annualAnalysisSummaries: annualRows,
      summary: { annual: { periodLabel: '2024' }, monthly: { periodLabel: 'Latest month' } }
    },
    outcomeDisplay: {} as any
  };
}

function annual(year: number): AnnualAnalysisSummary {
  return {
    year,
    energyUse: year * 10,
    adjusted: year * 9,
    savings: year,
    annualSavingsPercentImprovement: 1.5,
    totalSavingsPercentImprovement: 4.25,
    missingPredictorValue: false
  } as AnnualAnalysisSummary;
}

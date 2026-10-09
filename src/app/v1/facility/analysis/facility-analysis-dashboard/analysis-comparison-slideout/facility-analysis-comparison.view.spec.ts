import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { FacilityAnalysisDashboardCard } from '../facility-analysis.models';
import { buildFacilityAnalysisComparisonView } from './facility-analysis-comparison.view';

describe('buildFacilityAnalysisComparisonView', () => {
  it('aligns groups and highlights normalized modeling differences', () => {
    const first = card('analysis-a', 'Analysis A', {
      groups: [group('group-a', ['Production', 'Hours']), group('group-b', [], 'skip')]
    });
    const generatedPredictors = ['Hours', 'Production'].map(name => ({ id: name.toLowerCase(), name }));
    const second = card('analysis-b', 'Analysis B', {
      groups: [{
        ...group('group-a', [], 'regression', 3),
        isGeneratedModel: true,
        selectedModelId: 'generated-model',
        models: [{ modelId: 'generated-model', modelYear: 2022, predictorVariables: generatedPredictors, coef: [10, 3, 3] }]
      }, group('group-c', [])]
    });

    const view = buildFacilityAnalysisComparisonView(first, second, facility(), [
      { guid: 'group-a', name: 'Main process' },
      { guid: 'group-b', name: 'Support' },
      { guid: 'group-c', name: 'Water loop' }
    ] as any, [first.analysis, second.analysis]);

    expect(view.groups.map(item => item.name)).toEqual(['Main process', 'Support', 'Water loop']);
    expect(view.groups[0].fields.find(field => field.id === 'predictors')?.different).toBe(false);
    expect(view.groups[0].fields.find(field => field.id === 'equation')?.different).toBe(true);
    expect(view.groups[0].fields.find(field => field.id === 'model')).toMatchObject({
      firstValue: 'User-defined model · Model year 2022',
      secondValue: 'Generated model · Model year 2022',
      different: true
    });
    expect(view.groups[1].fields.find(field => field.id === 'inclusion')).toMatchObject({
      firstValue: 'Excluded', secondValue: 'Not configured', different: true
    });
  });

  it('aligns non-overlapping annual years and preserves transition and missing-data behavior', () => {
    const first = card('analysis-a', 'Analysis A', {}, [annual(2024, { isIntermediateBanked: true })]);
    const second = card('analysis-b', 'Analysis B', {}, [annual(2025, { missingPredictorValue: true })]);

    const view = buildFacilityAnalysisComparisonView(first, second, { fiscalYear: 'fiscalYear' } as any, [], [first.analysis, second.analysis]);

    expect(view.annualRows.map(row => row.yearLabel)).toEqual(['FY 2024', 'FY 2025']);
    expect(view.annualRows[0].first).toMatchObject({ adjusted: null, savings: null, annualImprovement: null });
    expect(view.annualRows[0].first?.markers).toContain('transition');
    expect(view.annualRows[1].second?.incomplete).toBe(true);
    expect(view.useChartRows[0].values['firstAdjusted']).toBeNull();
  });

  it('keeps percentage charts but suppresses the shared use chart for different units or bases', () => {
    const first = card('analysis-a', 'Analysis A', { energyUnit: 'MMBtu', energyIsSource: false }, [annual(2024)]);
    const second = card('analysis-b', 'Analysis B', { energyUnit: 'kWh', energyIsSource: true }, [annual(2024)]);

    const view = buildFacilityAnalysisComparisonView(first, second, facility(), [], [first.analysis, second.analysis]);

    expect(view.useChartCompatible).toBe(false);
    expect(view.useChartUnavailableMessage).toContain('different units and different site/source bases');
    expect(view.improvementChartRows).toHaveLength(1);
    expect(view.improvementChartMetrics).toHaveLength(4);
  });

  it('compares group banking source and years without including adjustment details', () => {
    const source = analysis('source', 'Banked source');
    const first = card('analysis-a', 'Analysis A', {
      hasBanking: true,
      bankedAnalysisItemId: source.guid,
      groups: [{ ...group('group-a', []), applyBanking: true, bankedAnalysisYear: 2022, newBaselineYear: 2023 }]
    });
    const second = card('analysis-b', 'Analysis B', { groups: [group('group-a', [])] });

    const view = buildFacilityAnalysisComparisonView(first, second, facility(), [{ guid: 'group-a', name: 'Main' }] as any, [source, first.analysis, second.analysis]);
    const banking = view.groups[0].fields.find(field => field.id === 'banking');

    expect(banking).toMatchObject({ firstValue: 'Banked source · Applied 2022 · New baseline 2023', secondValue: 'Not applied', different: true });
    expect(view.analysisFields.find(field => field.id === 'banking-enabled')).toMatchObject({
      firstValue: 'Enabled', secondValue: 'Disabled', different: true
    });
    expect(view.analysisFields.find(field => field.id === 'banking-source')).toMatchObject({
      firstValue: 'Banked source', secondValue: 'Not applicable', different: true
    });
    expect(view.groups[0].fields.map(field => field.id)).not.toContain('adjustments');
  });
});

function card(
  guid: string,
  name: string,
  overrides: Record<string, unknown> = {},
  annualRows: any[] = [annual(2024)]
): FacilityAnalysisDashboardCard {
  const item = analysis(guid, name, overrides);
  return {
    analysis: item,
    category: item.analysisCategory,
    status: 'ready', statusLabel: 'Ready', findings: [], isActiveForReporting: false,
    linkedAccountAnalyses: [], linkedReports: [], bankingConsumers: [], dependencyCount: 0,
    modifiedDateLabel: 'Jan 1, 2025', modifiedSortValue: 0, searchText: name.toLowerCase(), attentionRank: 3,
    outcome: {
      state: 'ready', reportYear: 2024, annualAnalysisSummaries: annualRows,
      summary: { annual: { periodLabel: '2024', value: 5 }, monthly: { periodLabel: 'Jan 2025', value: 4 } }
    },
    outcomeDisplay: {} as any
  };
}

function analysis(guid: string, name: string, overrides: Record<string, unknown> = {}): IdbAnalysisItem {
  return {
    guid, name, accountId: 'account-a', facilityId: 'facility-a', analysisCategory: 'energy',
    baselineYear: 2020, energyUnit: 'MMBtu', waterUnit: 'gal', energyIsSource: false,
    hasBanking: false, groups: [], ...overrides
  } as IdbAnalysisItem;
}

function group(idbGroupId: string, predictorNames: string[], analysisType = 'regression', coefficient = 2): any {
  return {
    idbGroupId, analysisType, isGeneratedModel: false, regressionModelYear: 2022,
    regressionConstant: 10, predictorVariables: predictorNames.map(name => ({
      id: name.toLowerCase(), name, productionInAnalysis: true, regressionCoefficient: coefficient
    })), applyBanking: false
  };
}

function annual(year: number, overrides: Record<string, unknown> = {}): any {
  return {
    year, energyUse: 100, adjusted: 90, savings: 10,
    annualSavingsPercentImprovement: 4, totalSavingsPercentImprovement: 8,
    isBanked: false, isIntermediateBanked: false, savingsBanked: 0,
    missingPredictorValue: false, ...overrides
  };
}

function facility(): any { return { fiscalYear: 'calendarYear' }; }

import { describe, expect, it } from 'vitest';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { StatusItem } from '@app/v1/status/status.models';
import { buildFacilityAnalysisCards } from './facility-analysis.models';

describe('buildFacilityAnalysisCards', () => {
  it('aggregates status, setup, active selection, and downstream dependencies', () => {
    const analysis = { ...makeAnalysis('analysis-a', 'Energy model'), bankedAnalysisItemId: 'banking-source' };
    const cards = buildFacilityAnalysisCards({
      analyses: [
        analysis,
        makeAnalysis('banking-source', 'Reference baseline'),
        { ...makeAnalysis('banking-consumer', 'Banked model'), bankedAnalysisItemId: analysis.guid }
      ],
      facility: { guid: 'facility-a', selectedEnergyAnalysisId: analysis.guid } as any,
      meterGroups: [{ guid: 'group-a', name: 'Main plant' }] as any,
      accountAnalyses: [{
        guid: 'account-analysis-a', name: 'Portfolio energy',
        facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: analysis.guid }]
      }] as any,
      reports: [{ guid: 'report-a', name: 'Annual report', analysisItemId: analysis.guid }] as any,
      statusState: 'ready',
      statusItems: [makeFinding('analysis-a:group-a', 'analysis-group', 'warning')]
    });

    const card = cards.find(item => item.analysis.guid === analysis.guid)!;
    expect(card).toMatchObject({
      status: 'warning',
      isActiveForReporting: true,
      groupCount: 1,
      regressionCount: 1,
      generatedModelCount: 2,
      dependencyCount: 3
    });
    expect(card.groupSummaries[0]).toMatchObject({ name: 'Main plant', predictorCount: 1, hasSelectedModel: true });
    expect(card.linkedAccountAnalyses.map(item => item.guid)).toEqual(['account-analysis-a']);
    expect(card.linkedReports.map(item => item.guid)).toEqual(['report-a']);
    expect(card.bankingSource?.guid).toBe('banking-source');
    expect(card.bankingConsumers.map(item => item.guid)).toEqual(['banking-consumer']);
    expect(card.searchText).toContain('main plant');
    expect(card.searchText).toContain('active reporting');
    expect(card.searchText).toContain('reference baseline');
    expect(card.searchText).toContain('banked model');
  });

  it('reports evaluating until the shared status evaluation is ready', () => {
    const [card] = buildFacilityAnalysisCards({
      analyses: [makeAnalysis('analysis-a', 'Water model', 'water')],
      facility: { guid: 'facility-a' } as any,
      meterGroups: [],
      accountAnalyses: [],
      reports: [],
      statusState: 'evaluating',
      statusItems: []
    });

    expect(card.status).toBe('evaluating');
    expect(card.statusLabel).toBe('Evaluating');
    expect(card.modifiedDateLabel).toBe('Jan 2, 2025');
  });
});

function makeAnalysis(guid: string, name: string, category: 'energy' | 'water' = 'energy'): IdbAnalysisItem {
  return {
    id: 1,
    guid,
    accountId: 'account-a',
    facilityId: 'facility-a',
    name,
    analysisCategory: category,
    energyIsSource: true,
    energyUnit: 'MMBtu',
    waterUnit: 'gal',
    baselineYear: 2022,
    hasBanking: false,
    bankedAnalysisItemId: undefined!,
    createdDate: new Date('2025-01-01T12:00:00Z'),
    modifiedDate: new Date('2025-01-02T12:00:00Z'),
    groups: [{
      idbGroupId: 'group-a',
      analysisType: 'regression',
      predictorVariables: [{ id: 'predictor-a', name: 'Production', production: true, productionInAnalysis: true, regressionCoefficient: 1 }],
      models: [{ modelId: 'model-a' }, { modelId: 'model-b' }],
      selectedModelId: 'model-a'
    } as any]
  };
}

function makeFinding(guid: string, kind: 'facility-analysis' | 'analysis-group', severity: 'error' | 'warning'): StatusItem {
  return {
    id: `finding-${guid}`,
    code: kind === 'facility-analysis' ? 'analysis.configuration.invalid' : 'analysis-group.model.invalid',
    severity,
    category: 'configuration',
    entity: { kind, guid, name: 'Analysis', accountGuid: 'account-a', facilityGuid: 'facility-a' },
    evidence: {},
    title: 'Review analysis',
    description: 'Review the analysis setup.',
    todo: true,
    destination: { kind: 'unavailable' }
  };
}

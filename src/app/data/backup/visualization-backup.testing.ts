import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { IdbSavedVisualization } from '@data/models/idbModels/saved-visualization';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { analysisVisualizationFixture, energyUseVisualizationFixture, utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { createVisualizationDefinition, VisualizationDefinition } from '@domain/visualizations/visualization-definition';

export function savedVisualizationFixture(definition: VisualizationDefinition, guid = 'visualization-a'): IdbSavedVisualization {
  return { guid, accountId: definition.accountGuid, ...(definition.scope.kind === 'facility' ? { facilityId: definition.scope.facilityGuid } : {}),
    recordVersion: 1, revision: 3, createdDate: '2026-01-01T00:00:00.000Z', modifiedDate: '2026-01-02T00:00:00.000Z', definition };
}

export function visualizationBackupSnapshot(): AccountWorkspaceSnapshot {
  const account = { ...getNewIdbAccount(), guid: 'account-a' };
  const facility = { ...getNewIdbFacility(account), guid: 'facility-a' };
  const utility = utilityVisualizationFixture({ kind: 'facility', facilityGuid: facility.guid });
  const predictor = (kind: 'predictor' | 'weather'): VisualizationDefinition => ({
    ...createVisualizationDefinition(kind, account.guid, { kind: 'facility', facilityGuid: facility.guid }, kind),
    sources: [{ id: 'predictor', kind, measure: 'value', aggregation: 'none', selection: { kind: 'fixed', resource: 'predictor', guids: ['predictor-a'] } }]
  });
  const energy = { ...energyUseVisualizationFixture(), sources: [{ ...energyUseVisualizationFixture().sources[0],
    selection: { kind: 'fixed', resource: 'equipment', guids: ['equipment-a'] } }] } as VisualizationDefinition;
  const charges: VisualizationDefinition = { ...utility, sources: [{ id: 'utility', kind: 'utility', measure: 'charge', aggregation: 'none',
    dataMode: 'billing-period', groupBy: 'meter', charge: { meterGuid: 'meter-a', chargeGuid: 'charge-a', measure: 'cost' } }] };
  return {
    account, facilities: [facility],
    meters: [{ guid: 'meter-a', accountId: account.guid, facilityId: facility.guid, groupId: 'group-a', name: 'Meter',
      charges: [{ guid: 'charge-a', name: 'Demand', chargeType: 'demand' }] } as any],
    meterGroups: [{ guid: 'group-a', accountId: account.guid, facilityId: facility.guid, name: 'Meter group' } as any],
    predictors: [{ guid: 'predictor-a', accountId: account.guid, facilityId: facility.guid, name: 'Predictor' } as any],
    facilityAnalyses: [{ guid: 'analysis-a', accountId: account.guid, facilityId: facility.guid, groups: [{
      idbGroupId: 'group-a', analysisType: 'regression', isGeneratedModel: true, predictorVariables: [], selectedModelId: 'model-a',
      models: [{ modelId: 'model-a', predictorVariables: [], coef: [1], t: { p: [.1] }, f: {} },
        { modelId: 'model-b', predictorVariables: [], coef: [2], t: { p: [.2] }, f: {} }]
    }] } as any],
    energyUseGroups: [{ guid: 'energy-group-a', accountId: account.guid, facilityId: facility.guid, name: 'Equipment group' } as any],
    energyUseEquipment: [{ guid: 'equipment-a', accountId: account.guid, facilityId: facility.guid, name: 'Equipment',
      energyUseGroupId: 'energy-group-a', utilityMeterGroupIds: [], utilityData: [] } as any],
    savedVisualizations: [utility, utilityVisualizationFixture(), predictor('predictor'), predictor('weather'), energy,
      analysisVisualizationFixture(), analysisVisualizationFixture(true), charges]
      .map((definition, index) => savedVisualizationFixture(definition, `visualization-${index}`)),
    meterData: [], predictorData: [], accountAnalyses: [], accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: []
  };
}

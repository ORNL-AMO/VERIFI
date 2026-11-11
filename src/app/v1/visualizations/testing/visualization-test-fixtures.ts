import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';

export const visualizationAccount = { ...getNewIdbAccount(), id: 1, guid: 'account-a', name: 'Account A' };
export const visualizationFacility = { ...getNewIdbFacility(visualizationAccount), id: 1, guid: 'facility-a', name: 'Plant A' };
export function visualizationRecord() {
  return { ...getNewIdbSavedVisualization(createVisualizationDefinition('My energy', visualizationAccount.guid,
    { kind: 'facility', facilityGuid: visualizationFacility.guid }, 'utility')), id: 1, guid: 'visualization-a' };
}
export function visualizationSnapshot(): AccountWorkspaceSnapshot {
  return { account: visualizationAccount, facilities: [visualizationFacility], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [],
    energyUseGroups: [], energyUseEquipment: [], savedVisualizations: [visualizationRecord()] };
}

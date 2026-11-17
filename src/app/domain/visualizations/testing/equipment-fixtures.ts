import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbFacilityEnergyUseEquipment, type IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import type { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { createVisualizationDefinition } from '../visualization-definition';
import { useEquipmentHistorySettings } from '../energy-use/equipment-source';

export function equipmentFixture(overrides: Partial<IdbFacilityEnergyUseEquipment> = {}): IdbFacilityEnergyUseEquipment {
  const group = { guid: 'group-a', accountId: 'account-a', facilityId: 'facility-a' } as IdbFacilityEnergyUseGroup;
  return { ...getNewIdbFacilityEnergyUseEquipment(group, 2024), guid: 'equipment-a', name: 'Pump', operatingConditionsData: [],
    utilityData: [{ energySource: 'Electricity', size: 1, units: 'kW', numberOfEquipment: 1,
      energyUse: [{ year: 2024, energyUse: 10, energyUseUnit: 'kWh', overrideEnergyUse: true }] }], ...overrides };
}
export function equipmentSnapshot(items = [equipmentFixture()]): AccountWorkspaceSnapshot {
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a', energyUnit: 'MJ' };
  const facility = { ...getNewIdbFacility(account), id: 1, guid: 'facility-a', energyUnit: 'kWh', fiscalYear: 'calendarYear' as const };
  return { account, facilities: [facility], energyUseEquipment: items, energyUseGroups: [], savedVisualizations: [],
    meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [], facilityAnalyses: [], accountAnalyses: [],
    accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [] };
}
export function equipmentDefinition(guids = ['equipment-a']) {
  const base = useEquipmentHistorySettings(createVisualizationDefinition('Equipment history', 'account-a', { kind: 'all' }, 'energy-use'), 'source-1');
  return { ...base, sources: base.sources.map(source => source.kind === 'energy-use' ? { ...source,
    selection: { kind: 'fixed' as const, resource: 'equipment' as const, guids } } : source),
    series: [{ id: 'equipment', sourceId: 'source-1', metric: 'consumption', axis: 'left' as const }] };
}

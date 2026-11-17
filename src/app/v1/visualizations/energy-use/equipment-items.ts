import { orderDecisionItems } from '../shared/item-appearance';
import { EQUIPMENT_TYPES, energyUseSelectionMode, energyUseSeriesId, selectedEnergyUseIds } from '@domain/visualizations/energy-use/equipment-selection';
import { energyUseIcon } from '@app/v1/data/energy-uses/models/energy-use-icons';
import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { EnergyUseSelectionMode, VisualizationDefinition, VisualizationScope } from '@domain/visualizations/visualization-definition';
import { equipmentCatalog, equipmentUnit } from '@domain/visualizations/energy-use/equipment-source';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import type { DecisionItemIdentity, DecisionResourceChoice, VisualizationDecisionItem } from '../decisions/decision-types';
import { isCustomized, itemKey, resolveItemPresentation } from '../shared/item-appearance';

export function energyUseSelectionChoices() { return [
  { value: 'group', label: 'Energy use group', icon: 'energyUseGroup' },
  { value: 'equipment', label: 'Equipment', icon: 'energy' },
  { value: 'equipment-type', label: 'Equipment type', icon: 'filter' },
  { value: 'linked-meter-group', label: 'Linked meter group', icon: 'meterGroupItem' },
  { value: 'facility', label: 'Facility', icon: 'facility' }
] as const; }

export function equipmentResourceChoices(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope, mode: EnergyUseSelectionMode = 'equipment'): readonly DecisionResourceChoice[] {
  const items = equipmentCatalog(snapshot, scope);
  if (mode === 'facility') return snapshot.facilities.filter(f => f.accountId === snapshot.account.guid && scope.facilityGuids.includes(f.guid))
    .map(f => ({ value: f.guid, label: f.name || 'Unnamed facility', icon: 'facility', available: true, detail: `${new Set(items.filter(item => item.facilityId === f.guid).map(item => item.guid)).size} equipment items` }));
  if (mode === 'equipment-type') return EQUIPMENT_TYPES.map(type => ({ value: type, label: type, icon: energyUseIcon(type), available: true, detail: `${items.filter(item => item.equipmentType === type).length} equipment items` }));
  if (mode !== 'equipment') return (mode === 'group' ? snapshot.energyUseGroups : snapshot.meterGroups).filter(group => group.accountId === snapshot.account.guid && scope.facilityGuids.includes(group.facilityId) && snapshot.facilities.some(f => f.guid === group.facilityId && f.accountId === snapshot.account.guid)).map(group => ({ value: group.guid, label: group.name || 'Unnamed group', icon: mode === 'group' ? 'energyUseGroup' : 'meterGroupItem', available: true, detail: [snapshot.facilities.find(f => f.guid === group.facilityId)?.name, `${items.filter(item => item.facilityId === group.facilityId && (mode === 'group' ? item.energyUseGroupId === group.guid : item.utilityMeterGroupIds?.includes(group.guid))).length} equipment items`].filter(Boolean).join(' · ') }));
  return equipmentCatalog(snapshot, scope).map(item => ({ value: item.guid, label: item.name || 'Unnamed equipment', icon: 'energyUseGroup', available: true,
    detail: [snapshot.facilities.find(f => f.guid === item.facilityId)?.name,
      snapshot.energyUseGroups.find(g => g.guid === item.energyUseGroupId && g.facilityId === item.facilityId && g.accountId === item.accountId)?.name || 'Group unavailable',
      item.noLongerInUse?.isNoLongerInUse ? 'Retired' : '', !item.utilityData.some(source => source.energyUse.length) ? 'No saved consumption' : ''].filter(Boolean).join(' · ') }));
}
export function projectEquipmentItems(definition: VisualizationDefinition, sourceId: string, snapshot: AccountWorkspaceSnapshot): readonly VisualizationDecisionItem[] {
  const source = definition.sources.find(s => s.id === sourceId);
  if (source?.kind !== 'energy-use' || !energyUseSelectionMode(source)) return [];
  const scope = resolveVisualizationFacilities(definition, snapshot.facilities).scope, choices = equipmentResourceChoices(snapshot, scope, energyUseSelectionMode(source));
  return orderDecisionItems(selectedEnergyUseIds(source).map(guid => {
    const choice = choices.find(c => c.value === guid), id = energyUseSeriesId(source, guid);
    const identity: DecisionItemIdentity = energyUseSelectionMode(source) === 'equipment-type' ? { seriesId: id } : { resourceGuid: guid };
    const { series, override, appearance } = resolveItemPresentation(definition,
      { sourceId, metric: 'consumption', identity, providerSeriesId: id });
    return { key: itemKey(identity), sourceId, selectedId: series?.id ?? `${sourceId}-series`, identity,
      label: choice?.label ?? `Unavailable: ${guid}`, detail: choice?.detail ?? 'Saved equipment is unavailable', unit: equipmentUnit(snapshot, scope, source),
      available: !!choice, missing: !choice, customized: !!series && isCustomized(series) || !!override && isCustomized(override, true),
      customColor: series?.color !== undefined || override?.color !== undefined,
      appearance };
  }));
}

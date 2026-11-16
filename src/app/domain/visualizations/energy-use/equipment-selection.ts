import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { EquipmentType, IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import type { EnergyUseSelectionMode, EnergyUseVisualizationSource, VisualizationResourceKind, VisualizationScope } from '../visualization-definition';
import type { VisualizationResolvedReference } from '../visualization-source-provider';

export const EQUIPMENT_TYPES: readonly EquipmentType[] = ['Pump', 'Fan', 'Process Heating', 'Compressed Air', 'Steam', 'Process Cooling', 'Motor', 'Lighting', 'HVAC', 'Mobile', 'Other'];
export function equipmentCatalog(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope) {
  return snapshot.energyUseEquipment.filter(item => item.accountId === snapshot.account.guid && scope.facilityGuids.includes(item.facilityId)
    && snapshot.facilities.some(f => f.accountId === snapshot.account.guid && f.guid === item.facilityId))
    .sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid));
}
/** Existing exact-equipment intent keeps its meaning without a migration or hydration write. */
export function energyUseSelectionMode(source: EnergyUseVisualizationSource): EnergyUseSelectionMode | undefined {
  return source.selectionMode ?? (source.selection?.kind === 'fixed' && source.selection.resource === 'equipment' ? 'equipment' : undefined);
}
export const energyUseResourceKind = (mode: EnergyUseSelectionMode): VisualizationResourceKind => mode === 'facility' ? 'facility' : mode === 'group' ? 'energy-use-group' : mode === 'linked-meter-group' ? 'meter-group' : 'equipment';
export function selectedEnergyUseIds(source: EnergyUseVisualizationSource): readonly string[] {
  return energyUseSelectionMode(source) === 'equipment-type' ? source.equipmentTypes ?? [] : source.selection?.kind === 'fixed' ? source.selection.guids : [];
}
export function energyUseSeriesId(source: EnergyUseVisualizationSource, key: string): string {
  const mode = energyUseSelectionMode(source);
  return `${source.id}:${mode === 'equipment-type' ? 'equipment-type' : mode ? energyUseResourceKind(mode) : 'equipment'}:${key}`;
}
export interface EnergyUseBucket {
  readonly key: string; readonly label: string; readonly detail: string; readonly resourceGuid?: string; readonly facilityGuid?: string;
  readonly items: readonly IdbFacilityEnergyUseEquipment[];
}
export function energyUseBuckets(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope, source: EnergyUseVisualizationSource): {
  readonly buckets: readonly EnergyUseBucket[]; readonly references: readonly VisualizationResolvedReference[]; readonly missing: readonly { kind: VisualizationResourceKind; id: string }[];
} {
  const mode = energyUseSelectionMode(source), items = equipmentCatalog(snapshot, scope), references: VisualizationResolvedReference[] = [], missing: { kind: VisualizationResourceKind; id: string }[] = [];
  const owned = (record: { accountId: string; facilityId: string }) => record.accountId === snapshot.account.guid && scope.facilityGuids.includes(record.facilityId)
    && snapshot.facilities.some(f => f.guid === record.facilityId && f.accountId === snapshot.account.guid);
  const catalog = mode === 'group' ? snapshot.energyUseGroups.filter(owned) : mode === 'linked-meter-group' ? snapshot.meterGroups.filter(owned) : items;
  const buckets = [...new Set(selectedEnergyUseIds(source))].flatMap<EnergyUseBucket>(key => {
    if (mode === 'equipment-type') return [{ key, label: key, detail: 'Matching equipment across included facilities', items: items.filter(item => item.equipmentType === key) }];
    if (mode === 'facility') {
      const facility = snapshot.facilities.find(f => f.guid === key && f.accountId === snapshot.account.guid && scope.facilityGuids.includes(f.guid));
      if (!facility) { missing.push({ kind: 'facility', id: key }); return []; }
      references.push({ kind: 'facility', id: key, accountGuid: facility.accountId, facilityGuid: key });
      return [{ key, label: facility.name || 'Unnamed facility', detail: '', resourceGuid: key, facilityGuid: key,
        items: [...new Map(items.filter(item => item.facilityId === key).map(item => [item.guid, item])).values()] }];
    }
    const record = catalog.find(item => item.guid === key);
    const kind = energyUseResourceKind(mode ?? 'equipment');
    if (!record) { missing.push({ kind, id: key }); return []; }
    references.push({ kind, id: key, accountGuid: record.accountId, facilityGuid: record.facilityId });
    const members = mode === 'group' ? items.filter(item => item.facilityId === record.facilityId && item.energyUseGroupId === key)
      : mode === 'linked-meter-group' ? items.filter(item => item.facilityId === record.facilityId && item.utilityMeterGroupIds?.includes(key)) : items.filter(item => item.guid === key);
    return [{ key, label: record.name || 'Unnamed selection', detail: snapshot.facilities.find(f => f.guid === record.facilityId)?.name ?? '', resourceGuid: key, facilityGuid: record.facilityId, items: members }];
  });
  for (const item of new Map(buckets.flatMap(bucket => bucket.items).map(item => [item.guid, item])).values()) {
    if (!references.some(ref => ref.kind === 'equipment' && ref.id === item.guid)) references.push({ kind: 'equipment', id: item.guid, accountGuid: item.accountId, facilityGuid: item.facilityId });
  }
  return { buckets, references, missing };
}

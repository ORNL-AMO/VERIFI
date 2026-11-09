import type { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import type { BackupFile } from '@data/models/backup-file';
import type { GuidPair } from './status-warning-dismissal-remap';

interface GroupOwner {
  readonly guid: string;
  readonly accountId: string;
  readonly facilityId: string;
}

/** Missing groups remain unresolved; a known group must belong to the equipment owner. */
export function energyUseBackupReferencesError(equipment: Readonly<IdbFacilityEnergyUseEquipment>,
  energyUseGroups: readonly GroupOwner[], meterGroups: readonly GroupOwner[]): string | undefined {
  const validGuid = (guid: unknown): guid is string => typeof guid === 'string' && !!guid.trim();
  if (!validGuid(equipment.energyUseGroupId)) return 'Energy-use equipment needs a nonempty energy-use group identifier.';
  const meterLinks = equipment.utilityMeterGroupIds ?? [];
  if (!Array.isArray(meterLinks) || !Array.from(meterLinks).every(validGuid)) {
    return 'Energy-use meter-group links must be an array of nonempty group identifiers.';
  }
  const owned = (guid: string, groups: readonly GroupOwner[]) => groups.filter(group => group.guid === guid)
    .every(group => group.accountId === equipment.accountId && group.facilityId === equipment.facilityId);
  if (!owned(equipment.energyUseGroupId, energyUseGroups) || !meterLinks.every(guid => owned(guid, meterGroups))) {
    return 'Energy-use equipment references a group owned by another account or facility.';
  }
  return undefined;
}

/** Remap imported groups only. Preserve unavailable GUIDs for recovery and later backups. */
export function remapEnergyUseBackupReferences(equipment: IdbFacilityEnergyUseEquipment,
  energyUseGroups: readonly GuidPair[], meterGroups: readonly GuidPair[]): IdbFacilityEnergyUseEquipment {
  const remap = (guid: string, groups: readonly GuidPair[]) => groups.find(group => group.oldId === guid)?.newId ?? guid;
  return { ...equipment, energyUseGroupId: remap(equipment.energyUseGroupId, energyUseGroups),
    utilityMeterGroupIds: (equipment.utilityMeterGroupIds ?? []).map(guid => remap(guid, meterGroups)) };
}

export function unresolvedEnergyUseBackupReferences(backup: Pick<BackupFile, 'facilityEnergyUseEquipment' | 'facilityEnergyUseGroups' | 'groups'>):
  readonly { store: 'facilityEnergyUseGroups' | 'utilityMeterGroups'; guid: string }[] {
  const missing = (references: readonly string[], groups: readonly GroupOwner[]) => [...new Set(references)]
    .filter(guid => typeof guid === 'string' && !!guid && !groups.some(group => group.guid === guid));
  return [
    ...missing(backup.facilityEnergyUseEquipment.map(item => item.energyUseGroupId), backup.facilityEnergyUseGroups)
      .map(guid => ({ store: 'facilityEnergyUseGroups' as const, guid })),
    ...missing(backup.facilityEnergyUseEquipment.flatMap(item => item.utilityMeterGroupIds ?? []), backup.groups)
      .map(guid => ({ store: 'utilityMeterGroups' as const, guid }))
  ];
}

import type { MeterSource } from '@data/models/constantsAndTypes';
import type { IdbFacility } from '@data/models/idbModels/facility';
import type { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import type { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import type { IdbEntry } from '@data/models/idbModels/idbEntry';
import type { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import type { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';

export interface EnergyUseOwner { readonly accountGuid: string; readonly facilityGuid: string; }
export interface EnergyUseCommandIdentity extends EnergyUseOwner { readonly energyUseGuid: string; }

/** The utility set supplied by the linked groups, independently of readings. */
export function energyUseLinkedSources(owner: EnergyUseOwner, groupIds: readonly string[], meters: readonly IdbUtilityMeter[]): readonly MeterSource[] {
  return [...new Set(meters.filter(meter => meter.accountId === owner.accountGuid && meter.facilityId === owner.facilityGuid
    && groupIds.includes(meter.groupId)).map(meter => meter.source))];
}

/** Each utility can come from only one selected group, matching the v0 linking rule. */
export function energyUseMeterLinksError(item: Pick<IdbFacilityEnergyUseEquipment, 'utilityData' | 'utilityMeterGroupIds' | 'facilityId' | 'accountId'>,
  groups: readonly IdbUtilityMeterGroup[], meters: readonly IdbUtilityMeter[]): string | undefined {
  const seen = new Set<string>();
  const ids = new Set<string>();
  for (const guid of item.utilityMeterGroupIds) {
    const group = groups.find(group => group.guid === guid && group.accountId === item.accountId && group.facilityId === item.facilityId);
    if (!group || group.groupType !== 'Energy' || ids.has(guid)) return 'Choose available Energy meter groups owned by this facility, or unlink unavailable groups.';
    ids.add(guid);
    const sources = new Set(meters.filter(meter => meter.groupId === guid && meter.accountId === item.accountId && meter.facilityId === item.facilityId).map(meter => meter.source));
    for (const source of sources) {
      if (seen.has(source)) return 'Linked meter groups cannot share an energy source.';
      if (!item.utilityData.some(row => row.energySource === source)) return 'Each linked meter group source must have a configured energy use source.';
      seen.add(source);
    }
  }
  if (item.utilityMeterGroupIds.length && item.utilityData.some(source => !seen.has(source.energySource))) {
    return 'Utilities must match the sources supplied by the linked meter groups.';
  }
  return undefined;
}

/** Detached reviewed rows; undefined after means equipment-only deletion. */
export interface EnergyUseBatchChange {
  readonly facility: IdbFacility;
  readonly before: IdbFacilityEnergyUseEquipment;
  readonly after?: IdbFacilityEnergyUseEquipment;
}

export interface EnergyUseGroupIdentity extends EnergyUseOwner {
  readonly energyUseGroupGuid: string;
}

export interface EnergyUseGroupDeletion {
  readonly group: IdbFacilityEnergyUseGroup;
  readonly items: readonly IdbFacilityEnergyUseEquipment[];
}

export interface EnergyUseGroupSettings {
  readonly name: string;
  readonly notes: string;
}

/** Immutable review shared by the single-item and group-table transfer workflows. */
export interface EnergyUseTransferRequest {
  readonly accountGuid: string;
  readonly mode: 'move' | 'copy';
  readonly sources: readonly {
    readonly facility: IdbFacility;
    readonly item: IdbFacilityEnergyUseEquipment;
  }[];
  readonly destinationFacility: IdbFacility;
  readonly destinationGroup: {
    readonly kind: 'existing' | 'new';
    readonly group: IdbFacilityEnergyUseGroup;
  };
  /** Generated once per review, retained across rejected-write retries. */
  readonly copyIdentities: readonly IdbEntry[];
}

export interface EnergyUseTransferResult {
  readonly mode: 'move' | 'copy';
  readonly items: readonly IdbFacilityEnergyUseEquipment[];
  readonly group: IdbFacilityEnergyUseGroup;
}

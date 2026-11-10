import type { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import type { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import type { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import type { MeterSource } from '@data/models/constantsAndTypes';

export interface FootprintMeterGroupOption {
  readonly guid: string;
  readonly name: string;
  readonly sources: readonly MeterSource[];
}

/** Footprint mapping retains imported utility rows and links groups by source intersection, as in v0. */
export function footprintMeterGroupOptions(accountGuid: string, facilityGuid: string,
  equipment: readonly IdbFacilityEnergyUseEquipment[], groups: readonly IdbUtilityMeterGroup[],
  meters: readonly IdbUtilityMeter[]): FootprintMeterGroupOption[] {
  const sources = new Set(equipment.flatMap(item => item.utilityData.map(row => row.energySource)));
  return groups.filter(group => group.accountId === accountGuid && group.facilityId === facilityGuid && group.groupType === 'Energy')
    .map(group => ({ guid: group.guid, name: group.name, sources: [...new Set(meters.filter(meter => meter.accountId === accountGuid
      && meter.facilityId === facilityGuid && meter.groupId === group.guid).map(meter => meter.source))] }))
    .filter(group => group.sources.some(source => sources.has(source)))
    .sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid));
}

export function footprintMeterGroupError(ids: readonly string[], options: readonly FootprintMeterGroupOption[]): string | undefined {
  const sources = new Set<MeterSource>();
  for (const id of ids) {
    const group = options.find(option => option.guid === id);
    if (!group) return 'A selected meter group is no longer compatible or available in this facility. Remove it before applying.';
    for (const source of group.sources) {
      if (sources.has(source)) return 'Only one meter group can be linked for each energy source.';
      sources.add(source);
    }
  }
  return undefined;
}

export function footprintEquipmentLinks(item: IdbFacilityEnergyUseEquipment, ids: readonly string[], options: readonly FootprintMeterGroupOption[]): string[] {
  const sources = new Set(item.utilityData.map(row => row.energySource));
  return [...new Set(ids)].filter(id => options.find(option => option.guid === id)?.sources.some(source => sources.has(source)));
}

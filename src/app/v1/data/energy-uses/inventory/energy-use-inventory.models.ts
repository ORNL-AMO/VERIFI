import type { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { facilityMeterGroupRoute } from '@app/v1/routing/workspace-route';
import type { InventoryMeterGroupLink } from '@app/v1/shared/inventory/inventory.models';
import { energyUseIcon } from '../models/energy-use-icons';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import type { IdbFacility } from '@data/models/idbModels/facility';
import type { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import type { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import type { InventoryEnergyUseSnapshot } from '@app/v1/shared/inventory/inventory.models';

export type EnergyUseInventorySort = 'name' | 'facilityName' | 'modified';
export interface EnergyUseInventoryFilters {
  readonly search: string;
  readonly category: string;
  readonly lifecycle: 'all' | 'active' | 'retired';
  readonly sort: EnergyUseInventorySort;
}
export const ENERGY_USE_FILTER_DEFAULTS: EnergyUseInventoryFilters = { search: '', category: 'all', lifecycle: 'all', sort: 'name' };

export interface EnergyUseInventoryEntry {
  readonly guid: string;
  readonly icon: IconName;
  readonly item: Readonly<IdbFacilityEnergyUseEquipment>;
  readonly facility: Readonly<IdbFacility>;
  readonly name: string;
  readonly category: string;
  readonly availability: 'No sources configured' | 'No annual data' | 'Saved annual data';
  readonly snapshot: InventoryEnergyUseSnapshot;
  readonly searchText: string;
}

/** A read-only description of saved entries, never a calculation or validation result. */
export function buildEnergyUseInventory(
  accountGuid: string,
  facilities: readonly Readonly<IdbFacility>[],
  items: readonly Readonly<IdbFacilityEnergyUseEquipment>[],
  groups: readonly Readonly<IdbFacilityEnergyUseGroup>[],
  meterGroups: readonly Readonly<IdbUtilityMeterGroup>[] = []
): EnergyUseInventoryEntry[] {
  const owners = new Map(facilities.filter(facility => facility.accountId === accountGuid).map(facility => [facility.guid, facility]));
  const groupByOwner = new Map(groups.filter(group => group.accountId === accountGuid).map(group => [JSON.stringify([group.facilityId, group.guid]), group]));
  const meterGroupsByOwner = new Map(meterGroups.filter(group => group.accountId === accountGuid).map(group => [JSON.stringify([group.facilityId, group.guid]), group]));
  return items.flatMap(item => {
    const facility = owners.get(item.facilityId);
    if (!facility || item.accountId !== accountGuid) return [];
    const sources = (item.utilityData ?? []).map(source => source.energySource || 'Source unavailable');
    const years = [...new Set((item.utilityData ?? []).flatMap(source => (source.energyUse ?? [])
      .filter(entry => Number.isInteger(entry.year) && entry.year > 0 && Number.isFinite(entry.energyUse))
      .map(entry => entry.year)))].sort((a, b) => a - b);
    const group = groupByOwner.get(JSON.stringify([facility.guid, item.energyUseGroupId]));
    const name = item.name?.trim() || 'Untitled energy use';
    const category = item.equipmentType || 'Other';
    const retired = item.noLongerInUse?.isNoLongerInUse === true;
    const retirementYear = item.noLongerInUse?.year;
    const lifecycle = retired ? `Retired${Number.isInteger(retirementYear) && retirementYear > 0 ? ` in ${retirementYear}` : ''}` : 'Active';
    const availability = !sources.length ? 'No sources configured' : years.length ? 'Saved annual data' : 'No annual data';
    const linkedMeterGroups: InventoryMeterGroupLink[] = [...new Set(item.utilityMeterGroupIds ?? [])].map(guid => {
      const linked = meterGroupsByOwner.get(JSON.stringify([facility.guid, guid]));
      return linked ? { guid, label: linked.name?.trim() || 'Untitled meter group', route: facilityMeterGroupRoute(facility.guid, guid) }
        : { guid, label: 'Meter group unavailable' };
    }).sort((a, b) => a.label.localeCompare(b.label) || a.guid.localeCompare(b.guid));
    const snapshot: InventoryEnergyUseSnapshot = { meterGroups: linkedMeterGroups,
      sources, group: group?.name?.trim() || 'Group unavailable',
      years, notes: item.notes || ''
    };
    return [{ guid: item.guid, icon: energyUseIcon(category), item, facility, name, category, availability, snapshot,
      searchText: [name, item.notes || '', facility.name, category, ...sources, ...linkedMeterGroups.map(group => group.label), snapshot.group, availability, lifecycle].join(' ').toLowerCase() }];
  });
}

export function filterAndSortEnergyUses(entries: readonly EnergyUseInventoryEntry[], filters: EnergyUseInventoryFilters): EnergyUseInventoryEntry[] {
  const query = filters.search.trim().toLowerCase();
  const nameOrder = (a: EnergyUseInventoryEntry, b: EnergyUseInventoryEntry) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid);
  const modified = (entry: EnergyUseInventoryEntry) => {
    const time = new Date(entry.item.modifiedDate).getTime();
    return Number.isFinite(time) ? time : 0;
  };
  return entries.filter(entry => (!query || entry.searchText.includes(query))
    && (filters.category === 'all' || filters.category === entry.category)
    && (filters.lifecycle === 'all' || (filters.lifecycle === 'retired') === (entry.item.noLongerInUse?.isNoLongerInUse === true)))
    .sort((a, b) => (filters.sort === 'facilityName' ? a.facility.name.localeCompare(b.facility.name)
      : filters.sort === 'modified' ? modified(b) - modified(a) : 0) || nameOrder(a, b));
}

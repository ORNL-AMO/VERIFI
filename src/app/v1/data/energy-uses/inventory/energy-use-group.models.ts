import { energyUseIcon } from '../models/energy-use-icons';
import { facilityEnergyUseRoute } from '@app/v1/routing/workspace-route';
import type { IdbFacility } from '@data/models/idbModels/facility';
import type { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import type { EnergyUseInventoryEntry, EnergyUseInventoryFilters } from './energy-use-inventory.models';
import { filterAndSortEnergyUses } from './energy-use-inventory.models';
import type { InventoryEnergyUseGroupSnapshot } from '@app/v1/shared/inventory/inventory.models';

const UNAVAILABLE_ENERGY_USE_GROUP = 'unavailable';
export interface EnergyUseGroupEntry {
  /** Facility-qualified identity for portfolio cards and browse restoration. */
  readonly id: string;
  readonly guid: string;
  readonly facility: Readonly<IdbFacility>;
  readonly name: string;
  readonly unavailable: boolean;
  readonly items: readonly EnergyUseInventoryEntry[];
  readonly modified: number;
  readonly searchText: string;
}
export interface FilteredEnergyUseGroup extends EnergyUseGroupEntry {
  readonly snapshot: InventoryEnergyUseGroupSnapshot;
}
export function buildEnergyUseGroups(accountGuid: string, facilities: readonly Readonly<IdbFacility>[],
  groups: readonly Readonly<IdbFacilityEnergyUseGroup>[], entries: readonly EnergyUseInventoryEntry[]): EnergyUseGroupEntry[] {
  const owners = new Map(facilities.filter(facility => facility.accountId === accountGuid).map(facility => [facility.guid, facility]));
  const result = new Map<string, EnergyUseGroupEntry>();
  const members = new Map<string, EnergyUseInventoryEntry[]>();
  const key = (facility: string, guid: string) => JSON.stringify([facility, guid]);
  const modified = (date: Date | string) => new Date(date).getTime() || 0;
  for (const group of groups) {
    const facility = owners.get(group.facilityId);
    if (!facility || group.accountId !== accountGuid || group.guid === UNAVAILABLE_ENERGY_USE_GROUP) continue;
    const name = group.name?.trim() || 'Untitled energy-use group', notes = group.notes || '';
    result.set(key(facility.guid, group.guid), { id: key(facility.guid, group.guid), guid: group.guid, facility,
      name, unavailable: false, items: [], modified: modified(group.modifiedDate),
      searchText: [name, notes, facility.name].join(' ').toLowerCase() });
  }
  for (const entry of entries) {
    if (!owners.has(entry.facility.guid) || entry.item.accountId !== accountGuid) continue;
    const validKey = key(entry.facility.guid, entry.item.energyUseGroupId);
    const id = result.has(validKey) ? validKey : key(entry.facility.guid, UNAVAILABLE_ENERGY_USE_GROUP);
    const group = result.get(id) ?? { id, guid: UNAVAILABLE_ENERGY_USE_GROUP, facility: entry.facility,
      name: 'Group unavailable', unavailable: true, items: [], modified: 0,
      searchText: `group unavailable ${entry.facility.name}`.toLowerCase() };
    const bucket = members.get(id) ?? [];
    bucket.push(entry); members.set(id, bucket);
    result.set(id, { ...group, modified: Math.max(group.modified, modified(entry.item.modifiedDate)) });
  }
  return [...result.values()].map(group => ({ ...group, items: members.get(group.id) ?? [] }));
}
export function filterEnergyUseGroupItems(group: EnergyUseGroupEntry, filters: EnergyUseInventoryFilters): EnergyUseInventoryEntry[] {
  const search = group.searchText.includes(filters.search.trim().toLowerCase()) ? '' : filters.search;
  return filterAndSortEnergyUses(group.items, { ...filters, search });
}
export function filterAndSortEnergyUseGroups(groups: readonly EnergyUseGroupEntry[], filters: EnergyUseInventoryFilters): FilteredEnergyUseGroup[] {
  const query = filters.search.trim().toLowerCase();
  const filtered = groups.flatMap(group => {
    const matchingItems = filterEnergyUseGroupItems(group, filters);
    const emptyMatch = !group.items.length && filters.category === 'all' && filters.lifecycle === 'all' && (!query || group.searchText.includes(query));
    if (!matchingItems.length && !emptyMatch) return [];
    const items = group.items;
    const unique = (values: readonly string[]) => [...new Set(values)].sort();
    const categories = unique(items.map(item => item.category));
    const meterGroups = [...new Map(items.flatMap(item => item.snapshot.meterGroups ?? []).map(link => [link.guid, link])).values()]
      .sort((a, b) => a.label.localeCompare(b.label) || a.guid.localeCompare(b.guid));
    return [{ ...group, snapshot: { meterGroups,
      equipmentTypes: categories.map(label => ({ label, icon: energyUseIcon(label) })),
      items: matchingItems.map(item => ({ guid: item.guid, name: item.name, icon: item.icon, route: facilityEnergyUseRoute(item.facility.guid, group.guid, item.guid) })),
      categories, sources: unique(items.flatMap(item => item.snapshot.sources)),
      years: [...new Set(items.flatMap(item => item.snapshot.years))].sort((a, b) => a - b) } }];
  });
  return filtered.sort((a, b) => (filters.sort === 'modified' ? b.modified - a.modified
    : filters.sort === 'facilityName' ? a.facility.name.localeCompare(b.facility.name) : 0)
    || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

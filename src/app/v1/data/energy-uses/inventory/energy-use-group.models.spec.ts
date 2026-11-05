import { buildEnergyUseGroups, filterAndSortEnergyUseGroups, filterEnergyUseGroupItems } from './energy-use-group.models';
import { buildEnergyUseInventory, ENERGY_USE_FILTER_DEFAULTS } from './energy-use-inventory.models';
import { energyUseFacility, energyUseGroup, energyUseItem, energyUseSource } from '../energy-uses.testing';

function project(items = [energyUseItem()], groups = [energyUseGroup()]) {
  const facilities = [energyUseFacility(), energyUseFacility('facility-b')];
  return buildEnergyUseGroups('account-a', facilities, groups, buildEnergyUseInventory('account-a', facilities, items, groups));
}
describe('energy-use group browsing projections', () => {
  it('keeps empty groups, isolates facility ownership, and exposes orphaned items without mutations', () => {
    const items = [energyUseItem(), energyUseItem({ guid: 'wrong-owner', facilityId: 'facility-b' }), energyUseItem({ guid: 'foreign', accountId: 'foreign' })];
    const groups = [energyUseGroup(), energyUseGroup({ guid: 'empty' }), energyUseGroup({ guid: 'foreign-group', accountId: 'foreign' })];
    const before = structuredClone({ items, groups });
    const result = project(items, groups);
    expect(result.map(group => [group.facility.guid, group.guid, group.items.length])).toEqual([
      ['facility-a', 'group-a', 1], ['facility-a', 'empty', 0], ['facility-b', 'unavailable', 1]
    ]);
    expect({ items, groups }).toEqual(before);
  });
  it('uses identical group/item search predicates while counting full group metadata', () => {
    const items = [energyUseItem(), energyUseItem({ guid: 'fan', name: 'Fan', equipmentType: 'Fan', noLongerInUse: { isNoLongerInUse: true, year: 2024 }, utilityData: [energyUseSource({ energySource: 'Natural Gas' })] })];
    const group = project(items, [energyUseGroup({ notes: 'Finishing line' })])[0];
    const filters = { ...ENERGY_USE_FILTER_DEFAULTS, search: 'fan' };
    const result = filterAndSortEnergyUseGroups([group], filters)[0];
    expect(result.matchingItems.map(item => item.guid)).toEqual(['fan']);
    expect(filterEnergyUseGroupItems(group, filters)).toEqual(result.matchingItems);
    expect(result.snapshot).toMatchObject({ total: 2, matching: 1, active: 1, retired: 1, categories: ['Fan', 'Pump'], sources: ['Electricity', 'Natural Gas'], years: [2024] });
    expect(filterEnergyUseGroupItems(group, { ...filters, search: 'finishing' })).toHaveLength(2);
    expect(filterAndSortEnergyUseGroups([group], { ...filters, lifecycle: 'active' })).toHaveLength(0);
  });
  it('sorts by the latest group/member modification and distinguishes identically named groups across facilities', () => {
    const result = project([energyUseItem({ modifiedDate: new Date('2026-01-01') })], [energyUseGroup(), energyUseGroup({ guid: 'group-b', facilityId: 'facility-b' })]);
    const sorted = filterAndSortEnergyUseGroups(result, { ...ENERGY_USE_FILTER_DEFAULTS, sort: 'modified' });
    expect(sorted[0].guid).toBe('group-a'); expect(new Set(sorted.map(group => group.id)).size).toBe(2);
  });
  it('preserves sparse years, saved zeroes, and imported extra sources', () => {
    const item = energyUseItem({ utilityData: [energyUseSource(), energyUseSource({ energySource: 'Natural Gas', energyUse: [{ year: 2020, energyUse: 0, energyUseUnit: 'kWh', overrideEnergyUse: true }] }), energyUseSource({ energySource: 'Other Energy' })] });
    const result = filterAndSortEnergyUseGroups(project([item]), ENERGY_USE_FILTER_DEFAULTS)[0];
    expect(result.snapshot.years).toEqual([2020, 2024]); expect(result.snapshot.sources).toHaveLength(3);
  });
  it('projects 100 groups and 1,000 items without merging group identities or dropping members', () => {
    const groups = Array.from({ length: 100 }, (_, index) => energyUseGroup({ guid: `g-${index}` }));
    const items = Array.from({ length: 1000 }, (_, index) => energyUseItem({ guid: `e-${index}`, energyUseGroupId: `g-${index % 100}` }));
    const result = filterAndSortEnergyUseGroups(project(items, groups), ENERGY_USE_FILTER_DEFAULTS);
    expect(result).toHaveLength(100); expect(result.every(group => group.items.length === 10)).toBe(true);
  });
});

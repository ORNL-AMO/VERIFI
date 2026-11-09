import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { buildEnergyUseGroups, filterAndSortEnergyUseGroups, filterEnergyUseGroupItems } from './energy-use-group.models';
import { buildEnergyUseInventory, ENERGY_USE_FILTER_DEFAULTS } from './energy-use-inventory.models';
import { energyUseFacility, energyUseGroup, energyUseItem, energyUseSource } from '../energy-uses.testing';

function project(items = [energyUseItem()], groups = [energyUseGroup()]) {
  const facilities = [energyUseFacility(), energyUseFacility('facility-b')];
  return buildEnergyUseGroups('account-a', facilities, groups, buildEnergyUseInventory('account-a', facilities, items, groups));
}
describe('energy-use group browsing projections', () => {
  it('deduplicates the union of members’ meter groups while leaving saved notes unchanged', () => {
    const group = energyUseGroup({ notes: 'Saved group note' });
    const meterGroups = [{ ...getNewIdbUtilityMeterGroup('Energy', 'Production meters', 'facility-a', 'account-a'), guid: 'meter-group-a' }];
    const items = [energyUseItem(), energyUseItem({ guid: 'fan', utilityMeterGroupIds: ['meter-group-a', 'missing'] })];
    const entries = buildEnergyUseInventory('account-a', [energyUseFacility()], items, [group], meterGroups);
    const [result] = filterAndSortEnergyUseGroups(buildEnergyUseGroups('account-a', [energyUseFacility()], [group], entries), ENERGY_USE_FILTER_DEFAULTS);
    expect(result.snapshot.meterGroups).toHaveLength(2); expect(result.snapshot.meterGroups?.filter(link => link.route)).toHaveLength(1);
    expect(group.notes).toBe('Saved group note');
  });

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
    expect(result.snapshot.items.map(item => item.guid)).toEqual(['fan']);
    expect(result.snapshot.equipmentTypes).toEqual([{ label: 'Fan', icon: 'fan' }, { label: 'Pump', icon: 'pump' }]);
    expect(result.snapshot.items).toEqual([{ guid: 'fan', name: 'Fan', icon: 'fan', route: ['/v1', 'workspace', 'facility', 'facility-a', 'data', 'energy-uses', 'groups', 'group-a', 'items', 'fan'] }]);
    expect(filterEnergyUseGroupItems(group, filters).map(item => item.guid)).toEqual(result.snapshot.items.map(item => item.guid));
    expect(result.snapshot).toMatchObject({ categories: ['Fan', 'Pump'], sources: ['Electricity', 'Natural Gas'], years: [2024] });
    expect(filterEnergyUseGroupItems(group, { ...filters, search: 'finishing' })).toHaveLength(2);
    expect(filterAndSortEnergyUseGroups([group], { ...filters, lifecycle: 'active' })).toHaveLength(0);
  });
  it('deduplicates type icons while retaining every sorted item link, including Other', () => {
    const result = filterAndSortEnergyUseGroups(project([energyUseItem(), energyUseItem({ guid: 'pump-b', name: 'Pump B' }), energyUseItem({ guid: 'other', name: 'Other equipment', equipmentType: 'Other' })]), ENERGY_USE_FILTER_DEFAULTS)[0];
    expect(result.snapshot.equipmentTypes).toEqual([{ label: 'Other', icon: 'otherEquipment' }, { label: 'Pump', icon: 'pump' }]);
    expect(result.snapshot.items.map(item => item.guid)).toEqual(['other', 'energy-a', 'pump-b']);
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

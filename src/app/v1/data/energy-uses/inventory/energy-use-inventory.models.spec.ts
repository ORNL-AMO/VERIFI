import { buildEnergyUseInventory, ENERGY_USE_FILTER_DEFAULTS, filterAndSortEnergyUses } from './energy-use-inventory.models';
import { energyUseFacility, energyUseGroup, energyUseItem, energyUseSource } from '../energy-uses.testing';

describe('energy use inventory projections', () => {
  const build = (items = [energyUseItem()], groups = [energyUseGroup()]) => buildEnergyUseInventory('account-a', [energyUseFacility(), energyUseFacility('facility-b', 'South plant')], items, groups);
  it('retains imported sources, zero values, sparse years, history and group assignments without mutating records', () => {
    const item = energyUseItem({ utilityData: [energyUseSource(), energyUseSource({ energySource: 'Natural Gas' }), energyUseSource({ energySource: 'Other Fuels', energyUse: [{ year: 2022, energyUse: 20, energyUseUnit: 'MMBtu', overrideEnergyUse: false }] })] });
    const original = structuredClone(item);
    const [entry] = build([item]);
    expect(entry.availability).toBe('Saved annual data');
    expect(entry.snapshot.sources).toEqual(['Electricity', 'Natural Gas', 'Other Fuels']);
    expect(entry.snapshot.years).toEqual([2022, 2024]);
    expect(entry.snapshot.group).toBe('Production');
    expect(item).toEqual(original);
  });
  it('filters foreign ownership and retains missing-group and retired items', () => {
    const entries = build([energyUseItem({ energyUseGroupId: 'missing', noLongerInUse: { isNoLongerInUse: true, year: 2023 } }),
      energyUseItem({ guid: 'foreign', accountId: 'another' }), energyUseItem({ guid: 'orphan', facilityId: 'missing' })]);
    expect(entries).toHaveLength(1);
    expect(entries[0].snapshot).toMatchObject({ group: 'Group unavailable', lifecycle: 'Retired in 2023' });
    expect(build([energyUseItem()], [energyUseGroup({ facilityId: 'facility-b' })])[0].snapshot.group).toBe('Group unavailable');
  });
  it('reports availability from saved source consumption, never operating assumptions or non-finite entries', () => {
    expect(build([energyUseItem({ utilityData: [] })])[0].availability).toBe('No sources configured');
    expect(build([energyUseItem({ utilityData: [energyUseSource({ energyUse: [] })] })])[0].availability).toBe('No annual data');
    expect(build([energyUseItem({ utilityData: [energyUseSource({ energyUse: [{ year: 2024, energyUse: NaN, overrideEnergyUse: false, energyUseUnit: 'kWh' }] })] })])[0].availability).toBe('No annual data');
  });
  it('searches ownership, sources and group and sorts deterministically before pagination', () => {
    const entries = build([energyUseItem({ guid: 'z' }), energyUseItem({ guid: 'a' }), energyUseItem({ guid: 'south', facilityId: 'facility-b', name: 'Boiler', equipmentType: 'Other', utilityData: [energyUseSource({ energySource: 'Other Energy' })] })]);
    expect(filterAndSortEnergyUses(entries, ENERGY_USE_FILTER_DEFAULTS).map(entry => entry.guid)).toEqual(['south', 'a', 'z']);
    for (const search of ['north', 'electricity', 'production', 'pump']) {
      expect(filterAndSortEnergyUses(entries, { ...ENERGY_USE_FILTER_DEFAULTS, search }).map(entry => entry.guid)).toEqual(['a', 'z']);
    }
    expect(filterAndSortEnergyUses(entries, { ...ENERGY_USE_FILTER_DEFAULTS, sort: 'facilityName' }).map(entry => entry.guid)).toEqual(['a', 'z', 'south']);
    expect(filterAndSortEnergyUses(entries, { ...ENERGY_USE_FILTER_DEFAULTS, lifecycle: 'retired' })).toEqual([]);
    expect(entries.map(entry => entry.guid)).toEqual(['z', 'a', 'south']);
  });
});

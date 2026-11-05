import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { buildEnergyUseInventory, ENERGY_USE_FILTER_DEFAULTS, filterAndSortEnergyUses } from './energy-use-inventory.models';
import { energyUseFacility, energyUseGroup, energyUseItem, energyUseSource } from '../energy-uses.testing';

describe('energy use inventory projections', () => {
  it('projects only owned meter-group destinations, deduplicates IDs, and preserves unavailable references', () => {
    const group = { ...getNewIdbUtilityMeterGroup('Energy', 'Electric supply', 'facility-a', 'account-a'), guid: 'good' };
    const meterGroups = [group, { ...group, guid: 'foreign', accountId: 'account-b', name: 'Secret' }, { ...group, guid: 'south', facilityId: 'facility-b', name: 'South' }];
    const item = energyUseItem({ utilityMeterGroupIds: ['good', 'foreign', 'south', 'missing', 'good'] }), before = structuredClone({ item, meterGroups });
    const [entry] = buildEnergyUseInventory('account-a', [energyUseFacility()], [item], [energyUseGroup()], meterGroups);
    expect(entry.snapshot.meterGroups).toHaveLength(4);
    expect(entry.snapshot.meterGroups?.[0]).toEqual({ guid: 'good', label: 'Electric supply', route: ['/v1', 'workspace', 'facility', 'facility-a', 'data', 'meter-grouping', 'good', 'monthly-table'] });
    expect(entry.snapshot.meterGroups?.slice(1).every(link => link.label === 'Meter group unavailable' && !link.route)).toBe(true);
    expect(filterAndSortEnergyUses([entry], { ...ENERGY_USE_FILTER_DEFAULTS, search: 'electric supply' })).toEqual([entry]);
    expect({ item, meterGroups }).toEqual(before);
  });

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
    expect(entries[0].snapshot.group).toBe('Group unavailable');
    expect(filterAndSortEnergyUses(entries, { ...ENERGY_USE_FILTER_DEFAULTS, search: 'retired in 2023' })).toEqual(entries);
    expect(filterAndSortEnergyUses(entries, { ...ENERGY_USE_FILTER_DEFAULTS, lifecycle: 'retired' })).toEqual(entries);
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

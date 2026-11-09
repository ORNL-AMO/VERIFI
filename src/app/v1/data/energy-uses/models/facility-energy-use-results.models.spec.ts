import type { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { energyUseFacility, energyUseGroup, energyUseItem, energyUseSource } from '../energy-uses.testing';
import { buildEnergyUseGroups } from '../inventory/energy-use-group.models';
import { buildEnergyUseInventory } from '../inventory/energy-use-inventory.models';
import { facilityEnergyUseFlowOption } from '../energy-use-workbench/results/energy-use-results-charts';
import { buildFacilityEnergyUseResult } from './facility-energy-use-results.models';
import { buildEnergyUseResults } from './energy-use-results.models';

describe('Facility energy-use group footprint', () => {
  const facility = { ...energyUseFacility(), energyUnit: 'kWh', fiscalYear: 'calendarYear' as const };
  const groups = [energyUseGroup(), energyUseGroup({ guid: 'other', name: 'Utilities' }), energyUseGroup({ guid: 'empty', name: 'Empty' })];
  const source = (year: number, energyUse: number, energyUseUnit = 'kWh') => energyUseSource({ energyUse: [{ year, energyUse, energyUseUnit, overrideEnergyUse: true }] });
  function project(items: IdbFacilityEnergyUseEquipment[]) {
    const facilities = [facility, { ...facility, guid: 'facility-b' }];
    const entries = buildEnergyUseInventory(facility.accountId, facilities, items, groups);
    const owned = buildEnergyUseGroups(facility.accountId, facilities, groups, entries);
    return { owned, result: buildFacilityEnergyUseResult(owned, facility) };
  }

  it('uses the latest facility year for every group and agrees with group results and source links without writes', () => {
    const items = [
      energyUseItem({ guid: 'older', utilityData: [source(2022, 10), source(2024, 3.6, 'MJ')] }),
      energyUseItem({ guid: 'newer', energyUseGroupId: 'other', utilityData: [{ ...source(2025, 20), energySource: 'Natural Gas' }] }),
      energyUseItem({ guid: 'orphan', energyUseGroupId: 'deleted', utilityData: [source(2024, 5)] }),
      energyUseItem({ guid: 'foreign', facilityId: 'facility-b', utilityData: [source(2099, 1000)] }),
      energyUseItem({ guid: 'foreign-account', accountId: 'other-account', utilityData: [source(2098, 1000)] })
    ];
    const before = JSON.stringify(items), result = project(items).result!;
    expect(result.year).toBe(2025); expect(result.total).toBeCloseTo(36, 10); expect(result.partial).toBe(false);
    expect(result.period).toBe('2025-01-01 / 2025-12-31');
    expect(result.groups.find(row => row.group.guid === 'group-a')?.amount).toBeCloseTo(11, 10);
    expect(result.groups.find(row => row.group.guid === 'group-a')?.percent).toBeCloseTo(1100 / 36, 10);
    expect(result.groups.find(row => row.group.guid === 'unavailable')).toMatchObject({ amount: 5, group: { unavailable: true } });
    expect(result.sources.map(row => [row.source, row.total])).toEqual([['Electricity', 16], ['Natural Gas', 20]]);
    const sourceDetails = result.groups.find(row => row.group.guid === 'group-a')!.sources;
    expect(sourceDetails[1]).toMatchObject({ originalAmount: 3.6, originalUnit: 'MJ', originYear: 2024, amount: 1, state: 'carried', override: true });
    const combined = buildEnergyUseResults(items.filter(item => item.facilityId === facility.guid && item.accountId === facility.accountId), facility).at(-1)!;
    expect(combined.total).toBeCloseTo(result.total, 10);
    const series = facilityEnergyUseFlowOption(result, 'kWh').series as { links: { source: string; target: string; value: number }[]; data: { name: string }[] }[];
    expect(series[0].links).toHaveLength(3);
    expect(series[0].links.reduce((sum, link) => sum + link.value, 0)).toBeCloseTo(result.total, 10);
    expect(series[0].data.filter(row => row.name.startsWith('group:'))).toHaveLength(3);
    expect(series[0].data.some(row => row.name.startsWith('item:'))).toBe(false);
    expect(JSON.stringify(items)).toBe(before);
  });

  it('retains zero, invalid, missing-source and inactive contributions with partial totals and unavailable shares', () => {
    const { result } = project([
      energyUseItem({ guid: 'zero', utilityData: [source(2025, 0)] }),
      energyUseItem({ guid: 'invalid', energyUseGroupId: 'other', utilityData: [energyUseSource({ energyUse: [...source(2022, 10).energyUse, ...source(2025, NaN).energyUse] })] }),
      energyUseItem({ guid: 'inactive', utilityData: [source(2022, 10)], noLongerInUse: { isNoLongerInUse: true, year: 2023 } }),
      energyUseItem({ guid: 'no-sources', energyUseGroupId: 'deleted', utilityData: [] })
    ]);
    expect(result).toMatchObject({ year: 2025, total: 0, partial: true });
    expect(result!.groups.every(row => row.percent === null)).toBe(true);
    expect(result!.groups.find(row => row.group.guid === 'other')).toMatchObject({ amount: null, partial: true });
    expect(result!.groups.find(row => row.group.guid === 'unavailable')).toMatchObject({ amount: null, partial: true, sources: [] });
    expect(result!.sources[0]).toMatchObject({ total: 0, partial: true });
    expect(result!.groups.find(row => row.group.guid === 'group-a')?.sources.map(row => row.state)).toEqual(['entered', 'inactive']);
    expect((facilityEnergyUseFlowOption(result!, 'kWh').series as { links: unknown[] }[])[0].links).toEqual([]);
  });

  it('keeps explicit post-retirement history and ambiguous years visible without falling back', () => {
    const { result } = project([
      energyUseItem({ guid: 'retired', utilityData: [energyUseSource({ energyUse: [...source(2022, 10).energyUse, ...source(2025, 7).energyUse] })], noLongerInUse: { isNoLongerInUse: true, year: 2023 } }),
      energyUseItem({ guid: 'duplicate', energyUseGroupId: 'other', utilityData: [energyUseSource({ energyUse: [...source(2025, 1).energyUse, ...source(2025, 2).energyUse] })] })
    ]);
    expect(result).toMatchObject({ total: 7, partial: true });
    expect(result!.groups.find(row => row.group.guid === 'other')?.amount).toBeNull();
    expect(result!.groups.find(row => row.group.guid === 'group-a')?.sources[0].state).toBe('entered');
  });

  it('does not invent an annual result for no saved years or an invalid fiscal calendar', () => {
    const { owned } = project([energyUseItem({ utilityData: [energyUseSource({ energyUse: [] })] })]);
    expect(buildFacilityEnergyUseResult(owned, facility)).toBeUndefined();
    const withData = project([energyUseItem({ utilityData: [source(2025, 10)] })]).owned;
    expect(buildFacilityEnergyUseResult(withData, { ...facility, fiscalYear: 'nonCalendarYear', fiscalYearMonth: 99 })).toBeUndefined();
  });
});

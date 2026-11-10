import { energyUseFacility, energyUseGroup, energyUseItem, energyUseSource } from '../energy-uses.testing';
import { buildEnergyUseTreemap, projectEnergyUse } from './energy-use-projection.models';
import { buildEnergyUseResults, energyUseSourceBreakdown } from './energy-use-results.models';
import { energyUseComparisonOption, energyUseFlow, energyUseFlowOption } from '../energy-use-workbench/results/energy-use-results-charts';

describe('Energy Use result agreement', () => {
  const facility = { ...energyUseFacility(), energyUnit: 'kWh', fiscalYear: 'calendarYear' as const };
  const source = (year: number, amount: number, unit = 'kWh') => energyUseSource({ energyUse: [{ year, energyUse: amount, energyUseUnit: unit, overrideEnergyUse: true }] });

  it.each([-1, 12, NaN])('omits unavailable annual projections for invalid fiscal month %s without losing genuine zero totals', fiscalYearMonth => {
    const item = energyUseItem({ utilityData: [source(2025, 0)] });
    const owner = { ...facility, fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth };
    expect(buildEnergyUseResults([item], owner)).toEqual([]);
    const [valid] = buildEnergyUseResults([item], facility);
    expect(valid).toMatchObject({ year: 2025, total: 0, partial: false });
    expect(valid.period).not.toBe('');
    expect(valid.items[0].amount).toBe(0);
  });

  it('uses one known-value denominator for source flows, equipment bars, tables and treemaps without writes', () => {
    const items = [energyUseItem({ guid: 'a', utilityData: [source(2022, 10), source(2024, 3.6, 'MJ')] }),
      energyUseItem({ guid: 'b', utilityData: [source(2025, 9)] }),
      energyUseItem({ guid: 'partial', utilityData: [source(2022, 5), energyUseSource({ energyUse: [] })] })];
    const before = JSON.stringify(items);
    const results = buildEnergyUseResults(items, facility);
    expect(results.map(row => row.year)).toEqual([2022, 2023, 2024, 2025]);
    const selected = results.at(-1)!;
    expect(selected.total).toBeCloseTo(25, 9);
    expect(selected.partial).toBe(true);
    expect(selected.items.find(row => row.projection.item.guid === 'a')?.percent).toBeCloseTo(44, 9);
    const links = energyUseFlow(selected);
    expect(links).toHaveLength(3);
    expect(links.find(link => link.target === 'item:a')?.value).toBeCloseTo(11, 9);
    expect(links.reduce((sum, link) => sum + link.value, 0)).toBeCloseTo(selected.total, 9);
    const breakdown = energyUseSourceBreakdown(selected);
    expect(breakdown[0].items.find(row => row.item.guid === 'a')?.amount).toBeCloseTo(11, 9);
    expect(breakdown[0].items).toHaveLength(3);
    expect(breakdown[0].total).toBeCloseTo(selected.total, 9);
    expect(breakdown[0].partial).toBe(true);
    const tree = buildEnergyUseTreemap(selected.items.map(row => row.projection), [energyUseGroup()], undefined, facility.guid);
    expect(tree[0].value).toBeCloseTo(selected.total, 9);
    expect(tree[0].children?.find(row => row.itemGuid === 'a')?.percentOfPeriod).toBeCloseTo(44, 9);
    const bars = energyUseComparisonOption([selected], 'kWh', false).series as { data: { value: number | null }[] }[];
    expect(bars[0].data.reduce((sum, row) => sum + (row.value ?? 0), 0)).toBeCloseTo(selected.total, 9);
    expect(JSON.stringify(items)).toBe(before);
  });

  it.each([NaN, -1, Infinity])('never falls back around an invalid newer amount %s', amount => {
    const item = energyUseItem({ utilityData: [energyUseSource({ energyUse: [...source(2022, 20).energyUse, ...source(2024, amount).energyUse] })] });
    const selected = buildEnergyUseResults([item], facility).at(-1)!;
    expect(selected.items[0]).toMatchObject({ amount: null, percent: null });
    expect(selected.total).toBe(0); expect(selected.partial).toBe(true);
    expect(energyUseFlow(selected)).toEqual([]);
    expect(energyUseSourceBreakdown(selected)[0]).toMatchObject({ total: null, partial: true });
  });

  it('keeps genuine zero, missing, inactive and duplicate-year values distinct', () => {
    const items = [energyUseItem({ guid: 'zero', utilityData: [source(2022, 0)] }),
      energyUseItem({ guid: 'missing', utilityData: [source(2024, 10)] }),
      energyUseItem({ guid: 'inactive', utilityData: [source(2022, 5)], noLongerInUse: { isNoLongerInUse: true, year: 2022 } }),
      energyUseItem({ guid: 'duplicate', utilityData: [energyUseSource({ energyUse: [...source(2022, 10).energyUse, ...source(2022, 12).energyUse] })] })];
    const result = buildEnergyUseResults(items, facility).find(row => row.year === 2023)!;
    const byId = new Map(result.items.map(row => [row.projection.item.guid, row]));
    expect(byId.get('zero')?.amount).toBe(0);
    expect(byId.get('inactive')?.projection.sources[0].state).toBe('inactive');
    expect(byId.get('missing')?.amount).toBeNull();
    expect(byId.get('duplicate')?.projection.sources[0].state).toBe('invalid');
    expect(result.items.every(row => row.percent === null)).toBe(true);
    expect(energyUseSourceBreakdown(result)[0].items.find(row => row.item.guid === 'inactive')).toMatchObject({ amount: 0, inactive: true });
    const tree = buildEnergyUseTreemap(result.items.map(row => row.projection), [energyUseGroup()]);
    expect(tree[0].percentOfPeriod).toBeNull();
  });

  it('retains explicit post-retirement history and reinstatement while preserving source provenance', () => {
    const item = energyUseItem({ utilityData: [energyUseSource({ energyUse: [...source(2022, 20).energyUse, ...source(2025, 7).energyUse] })],
      noLongerInUse: { isNoLongerInUse: true, year: 2023 }, operatingConditionsData: [{ year: 2026 } as never] });
    const results = buildEnergyUseResults([item], facility);
    expect(results.map(row => row.items[0].amount)).toEqual([20, 20, 0, 7, 0]);
    expect(results[3].items[0].projection.sources[0]).toMatchObject({ state: 'entered', originalAmount: 7, originYear: 2025, override: true });
    item.noLongerInUse.isNoLongerInUse = false;
    expect(buildEnergyUseResults([item], facility).at(-1)!.items[0].amount).toBe(7);
  });

  it('leaves absent early years as null in stacked history and keeps colors stable after reordering', () => {
    const older = energyUseItem({ guid: 'old', utilityData: [source(2022, 20)] });
    const newer = energyUseItem({ guid: 'new', utilityData: [source(2025, 10)] });
    const results = buildEnergyUseResults([older, newer], facility);
    const series = energyUseComparisonOption(results, 'kWh', true).series as { id: string; data: { value: number | null }[] }[];
    expect(series.find(row => row.id === 'new')!.data.map(row => row.value)).toEqual([null, null, null, 10]);
    expect(buildEnergyUseResults([newer, older], facility)).toEqual(results);
  });

  it('does not blend different fiscal periods and uses requested units for portfolio values', () => {
    const item = energyUseItem({ utilityData: [source(2024, 3.6, 'MJ')] });
    const a = projectEnergyUse(item, facility, 2024, 'kWh')!;
    const b = projectEnergyUse({ ...item, guid: 'b', facilityId: 'b' }, { ...facility, guid: 'b', fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true }, 2024, 'kWh')!;
    const tree = buildEnergyUseTreemap([a, b], []);
    expect(tree).toHaveLength(2);
    expect(tree.every(row => Math.abs(row.value - 1) < 1e-9 && row.percentOfPeriod === 100)).toBe(true);
  });

  it('groups Sankey equipment by its supplying source and places shared equipment between suppliers', () => {
    const gas = energyUseItem({ guid: 'gas', name: 'Alpha burner', utilityData: [{ ...source(2024, 100), energySource: 'Natural Gas' }] });
    const electricity = energyUseItem({ guid: 'electricity', name: 'Zulu fan', utilityData: [source(2024, 100), { ...source(2024, 0), energySource: 'Natural Gas' }] });
    const shared = energyUseItem({ guid: 'shared', name: 'Hybrid', utilityData: [source(2024, 50), { ...source(2024, 50), energySource: 'Natural Gas' }] });
    const result = buildEnergyUseResults([gas, shared, electricity], facility)[0];
    const series = energyUseFlowOption(result, 'kWh').series as { data: { name: string }[]; links: { value: number }[] }[];
    expect(series[0].data.map(node => node.name)).toEqual([
      'source:Electricity', 'source:Natural Gas', 'item:electricity', 'item:shared', 'item:gas'
    ]);
    expect(series[0].links.reduce((sum, link) => sum + link.value, 0)).toBe(result.total);
  });

  it('labels horizontal comparison bars with annual consumption and reserves space for the facility unit', () => {
    const result = buildEnergyUseResults([energyUseItem({ utilityData: [source(2024, 12345.5)] })], facility)[0];
    const option = energyUseComparisonOption([result], 'kWh', false);
    const series = option.series as { label: { show: boolean; position: string; formatter: (params: { data: { value: number | null } }) => string } }[];
    expect(series[0].label.show).toBe(true);
    expect(series[0].label.position).toBe('right');
    expect(series[0].label.formatter({ data: { value: 12345.5 } })).toBe('12,346 kWh/yr');
    expect(series[0].label.formatter({ data: { value: 0 } })).toBe('0 kWh/yr');
    expect((option.grid as { right: number }).right).toBeGreaterThanOrEqual(120);
    expect(result.items[0].amount).toBe(12345.5);
  });

  it('rounds hover shares without changing precision or showing entered/carried labels', () => {
    const results = buildEnergyUseResults([
      energyUseItem({ guid: 'carried', name: 'Burner', utilityData: [source(2022, 2)] }),
      energyUseItem({ guid: 'entered', name: 'Fan', utilityData: [source(2025, 1), energyUseSource({ energyUse: [] })] })
    ], facility);
    const latest = results.at(-1)!;
    const bars = energyUseComparisonOption([latest], 'kWh', false).series as { data: { description: string }[] }[];
    expect(bars[0].data[0].description).toContain('67% of Group Usage');
    expect(bars[0].data[1].description).toContain('33% of Group Usage');
    expect(bars[0].data[1].description).toContain('Partial coverage · known values only');
    const flow = energyUseFlowOption(latest, 'kWh').series as { data: { description: string }[] }[];
    const history = energyUseComparisonOption(results, 'kWh', true).series as { data: { description: string }[] }[];
    const descriptions = [...bars[0].data, ...flow[0].data, ...history.flatMap(series => series.data)].map(row => row.description);
    expect(descriptions.every(text => !text.includes('carried-forward') && !text.includes('Entered values'))).toBe(true);
    expect(latest.items.find(row => row.projection.item.guid === 'carried')?.percent).toBeCloseTo(200 / 3, 10);
    expect(latest.items.find(row => row.projection.item.guid === 'carried')?.coverage).toContain('carried-forward');
    expect(latest.items.find(row => row.projection.item.guid === 'entered')?.coverage).toContain('Entered values');
  });

  it('uses the same solid equipment colors for entered and carried years in both summary charts', () => {
    const results = buildEnergyUseResults([
      energyUseItem({ guid: 'old', utilityData: [source(2022, 20)] }),
      energyUseItem({ guid: 'new', utilityData: [source(2025, 10)] })
    ], facility);
    const history = energyUseComparisonOption(results, 'kWh', true).series as {
      id: string; itemStyle: { color: string; decal?: unknown }; data: { itemStyle?: { decal?: unknown } }[]
    }[];
    const bars = energyUseComparisonOption([results.at(-1)!], 'kWh', false).series as { data: { itemStyle: { color: string; decal?: unknown } }[] }[];
    for (const series of history) {
      expect(series.itemStyle.decal).toBeUndefined();
      expect(series.data.every(row => row.itemStyle?.decal === undefined)).toBe(true);
      expect(bars[0].data.find(row => row.itemStyle.color === series.itemStyle.color)?.itemStyle.decal).toBeUndefined();
      expect(bars[0].data.some(row => row.itemStyle.color === series.itemStyle.color)).toBe(true);
    }
  });
});

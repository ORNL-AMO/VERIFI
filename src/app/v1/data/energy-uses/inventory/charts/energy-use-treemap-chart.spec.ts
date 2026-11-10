import { energyUseFacility, energyUseGroup, energyUseItem, energyUseSource } from '../../energy-uses.testing';
import { buildEnergyUseTreemap, projectEnergyUse } from '../../models/energy-use-projection.models';
import { ENERGY_USE_TREEMAP_ROOT, energyUseTreemapOption, formatTreemapPercentage } from './energy-use-treemap-chart';
import { buildEnergyUseTreemapResults } from './energy-use-treemap-results.models';

interface ChartNode { id: string; name: string; value?: number; kind: string; percentOfPeriod: number; itemStyle: { color: string }; label: { color: string }; children: ChartNode[]; }

describe('Energy Use v0-style treemap presentation', () => {
  const facility = { ...energyUseFacility(), energyUnit: 'kWh', fiscalYear: 'calendarYear' as const };
  const groups = [energyUseGroup({ color: '#29bb9c' }), energyUseGroup({ guid: 'roasting', name: 'Roasting', color: '#9b59b6' })];
  const items = [energyUseItem({ guid: 'boiler', name: 'Steam Boiler', utilityData: [energyUseSource({ energyUse: [{ year: 2025, energyUse: 30, energyUseUnit: 'kWh', overrideEnergyUse: true }] })] }),
    energyUseItem({ guid: 'fan', name: 'Fan', utilityData: [energyUseSource({ energyUse: [{ year: 2025, energyUse: 70, energyUseUnit: 'kWh', overrideEnergyUse: true }] })] }),
    energyUseItem({ guid: 'roaster', name: 'Roaster', energyUseGroupId: 'roasting', utilityData: [energyUseSource({ energyUse: [{ year: 2025, energyUse: 100, energyUseUnit: 'kWh', overrideEnergyUse: true }] })] })];
  const tree = () => buildEnergyUseTreemap(items.map(item => projectEnergyUse(item, facility, 2025, 'kWh')!), groups, undefined, facility.guid);
  const resultsContext = () => buildEnergyUseTreemapResults(items, [facility], facility.accountId, 2025, 'kWh');

  it('shows every equipment tile inside group-colored regions with contrasting labels and scope percentages', () => {
    const option = energyUseTreemapOption(tree(), groups, 'North plant (2025)', 'kWh', true, resultsContext());
    expect(option.legend).toMatchObject({ show: false });
    const series = (option.series as { data: ChartNode[]; leafDepth?: number; label: { formatter: (params: { data: ChartNode }) => string } }[])[0];
    expect(series.leafDepth).toBeUndefined();
    const context = series.data[0];
    expect(context.id).toBe(ENERGY_USE_TREEMAP_ROOT);
    expect(context.children.map(group => group.itemStyle.color)).toEqual(['#29bb9c', '#9b59b6']);
    for (const group of context.children) expect(group.children.every(item => item.itemStyle.color === group.itemStyle.color && item.label.color === group.label.color)).toBe(true);
    expect(context.children[0].label.color).toBe('#000000');
    expect(context.children[1].label.color).toBe('#ffffff');
    expect(series.label.formatter({ data: context.children[0].children[0] })).toBe('Steam Boiler\n15%');
    const tooltip = option.tooltip as unknown as { formatter: (params: { data: ChartNode }) => string };
    expect(tooltip.formatter({ data: { name: 'North plant (2025)' } as ChartNode })).toBe('North plant (2025)');
    expect(tooltip.formatter({ data: context.children[0].children[0] })).toContain('30% of Group Usage');
    expect(tooltip.formatter({ data: context.children[0].children[0] })).toContain('15% of Facility Usage');
    expect(tooltip.formatter({ data: context.children[0].children[0] })).toContain('15% of Account Usage');
    expect(tooltip.formatter({ data: context.children[0].children[0] })).not.toContain('2025-01-01');
    expect(tooltip.formatter({ data: context.children[0].children[0] })).not.toContain('Energy Balance');
    expect(context.children.flatMap(group => group.children).reduce((sum, node) => sum + node.value!, 0)).toBe(200);
  });

  it('keeps separate actual fiscal periods and never reports a combined portfolio total', () => {
    const other = { ...facility, guid: 'other', fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: true };
    const members = [items[0], { ...items[0], guid: 'other', facilityId: 'other' }];
    const tree = buildEnergyUseTreemap([projectEnergyUse(members[0], facility, 2025, 'kWh')!, projectEnergyUse(members[1], other, 2025, 'kWh')!], groups);
    const option = energyUseTreemapOption(tree, groups, 'Account (2025)', 'kWh', false,
      buildEnergyUseTreemapResults(members, [facility, other], facility.accountId, 2025, 'kWh'));
    const context = (option.series as { data: ChartNode[] }[])[0].data[0];
    expect(context.children).toHaveLength(2);
    expect(context.children.every(node => node.percentOfPeriod === 100)).toBe(true);
    expect(context.value).toBeUndefined();
    expect((option.tooltip as unknown as { formatter: (params: { data: ChartNode }) => string }).formatter({ data: context })).toBe('Account (2025)');
    const tooltip = option.tooltip as unknown as { formatter: (params: { data: ChartNode }) => string };
    expect(tooltip.formatter({ data: context.children[0].children[0] })).toContain('Account Usage: Unavailable · different fiscal calendars');
    expect(JSON.stringify(context)).not.toContain('"name":"2025-01-01 / 2025-12-31"');
  });

  it.each([[0, '0%'], [.001, '<1%'], [.49, '<1%'], [.99, '<1%'], [1, '1%'], [1.2, '1%'], [2.7, '3%']])('formats %s without presenting a positive share as zero', (value, expected) => {
    expect(formatTreemapPercentage(value as number)).toBe(expected);
  });

  it('keeps full facility, account and group denominators when inventory filtering leaves one item', () => {
    const other = { ...facility, guid: 'other' };
    const members = [...items, { ...items[0], guid: 'other-item', facilityId: 'other', utilityData: [energyUseSource({ energyUse: [{ year: 2025, energyUse: 200, energyUseUnit: 'kWh', overrideEnergyUse: true }] })] }];
    const results = buildEnergyUseTreemapResults(members, [facility, other], facility.accountId, 2025, 'kWh');
    const filtered = buildEnergyUseTreemap([results.rows[0]], groups, undefined, facility.guid);
    const option = energyUseTreemapOption(filtered, groups, 'Account (2025)', 'kWh', false, results);
    const item = (option.series as { data: ChartNode[] }[])[0].data[0].children[0].children[0];
    const text = (option.tooltip as unknown as { formatter: (params: { data: ChartNode }) => string }).formatter({ data: item });
    expect(text).toContain('15% of Facility Usage');
    expect(text).toContain('8% of Account Usage');
    expect(text).toContain('30% of Group Usage');
  });
});

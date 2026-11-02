import { buildInventoryMeterCharts } from './meter-inventory-charts';
import { calendarizedMeter, facility, group, meter, monthlyData } from '@app/v1/data/meters/facility-meters.testing';

describe('scoped inventory meter chart projections', () => {
  const facilities = [facility({ guid: 'a', name: 'Plant' }), facility({ guid: 'b', name: 'Plant' })];
  const groups = [group({ guid: 'ga', facilityId: 'a', name: 'Production' }), group({ guid: 'gb', facilityId: 'b', name: 'Production' })];
  const meters = [calendarizedMeter(meter({ guid: 'ma', facilityId: 'a', groupId: 'ga', name: 'Electricity' }), [monthlyData({ year: 2025, monthNumValue: 0, energyUse: 10, energyCost: 0 })], { showEnergyUse: true }),
    calendarizedMeter(meter({ guid: 'mb', facilityId: 'b', groupId: 'gb', name: 'Electricity' }), [monthlyData({ year: 2025, monthNumValue: 0, energyUse: 20, energyCost: -2 })], { showEnergyUse: true }),
    calendarizedMeter(meter({ guid: 'mc', facilityId: 'a', groupId: undefined }), [monthlyData({ year: 2025, monthNumValue: 2, energyUse: 5, energyCost: 0 })], { showEnergyUse: true })];
  it.each(['facilities', 'groups', 'meters'] as const)('preserves totals, zero costs, negative values and missing-month gaps when grouped by %s', grouping => {
    const charts = buildInventoryMeterCharts(meters, facilities, groups, grouping, 'kWh', 'gal');
    expect(charts.map(c => c.id)).toEqual(['energy', 'cost']);
    expect(charts[0].rows).toHaveLength(3);
    expect(Object.values(charts[0].rows[0].values).reduce((a,b) => a + (b || 0), 0)).toBe(30);
    expect(charts[0].rows[1].values).toEqual({});
    expect(Object.values(charts[1].rows[0].values)).toContain(-2);
    expect(charts[0].unit).toBe('kWh');
  });
  it('keeps duplicate names separate by GUID and includes an Unassigned group', () => {
    const chart = buildInventoryMeterCharts(meters, facilities, groups, 'groups', 'kWh', 'gal')[0];
    expect(new Set(chart.metrics.map(m => m.id)).size).toBe(3);
    expect(new Set(chart.metrics.map(m => m.label)).size).toBe(3);
    expect(chart.metrics.some(m => m.label.includes('Unassigned'))).toBe(true);
  });
  it('uses metric eligibility, retains zero water/cost and does not fabricate energy for water meters', () => {
    const water = calendarizedMeter(meter({ guid: 'water', facilityId: 'a', source: 'Water Intake' }),
      [monthlyData({ year: 2025, monthNumValue: 0, energyUse: 99, energyConsumption: 0, energyCost: 0 })], { showEnergyUse: false });
    const charts = buildInventoryMeterCharts([...meters, water], facilities, groups, 'meters', 'MMBtu', 'm3');
    expect(charts[0].metrics.some(metric => metric.id === 'water')).toBe(false);
    expect(charts[1].rows[0].values).toEqual({ water: 0 });
    expect(charts[1].unit).toBe('m3'); expect(charts[2].rows[0].values['water']).toBe(0);
  });
  it.each([
    [], ['energy'], ['water'], ['cost'], ['energy', 'water'], ['energy', 'cost'], ['water', 'cost'], ['energy', 'water', 'cost']
  ].map(available => ({ available })))('only offers metrics with finite samples: $available', ({ available }) => {
    const sample = monthlyData({ year: 2025, monthNumValue: 0,
      energyUse: available.includes('energy') ? 0 : NaN,
      energyConsumption: available.includes('water') ? 0 : NaN,
      energyCost: available.includes('cost') ? 0 : NaN });
    const source = [calendarizedMeter(meter({ guid: 'energy', facilityId: 'a' }), [sample], { showEnergyUse: true }),
      calendarizedMeter(meter({ guid: 'water', facilityId: 'a', source: 'Water Intake' }), [sample], { showEnergyUse: false })];
    expect(buildInventoryMeterCharts(source, facilities, groups, 'meters', 'kWh', 'gal').map(chart => chart.id)).toEqual(available);
  });
  it('omits empty histories and non-finite samples instead of creating empty metric choices', () => {
    const empty = calendarizedMeter(meter({ facilityId: 'a' }), [], { showEnergyUse: true });
    const invalid = calendarizedMeter(meter({ facilityId: 'a' }), [monthlyData({ energyUse: NaN, energyConsumption: Infinity, energyCost: -Infinity })], { showEnergyUse: true });
    expect(buildInventoryMeterCharts([], facilities, groups, 'groups', 'kWh', 'gal')).toEqual([]);
    expect(buildInventoryMeterCharts([empty, invalid], facilities, groups, 'groups', 'kWh', 'gal')).toEqual([]);
  });
  it('collects missing or foreign groups into one Unassigned series per facility', () => {
    const source = meters.map(item => ({ ...item, meter: { ...item.meter, facilityId: 'a', groupId: item.meter.guid === 'ma' ? 'gb' : 'deleted-group' } }));
    const chart = buildInventoryMeterCharts(source, facilities, groups, 'groups', 'kWh', 'gal')[0];
    expect(chart.metrics.map(metric => metric.id)).toEqual(['group:a:unassigned']);
    expect(chart.rows[0].values).toEqual({ 'group:a:unassigned': 30 });
  });
  it('provides explicit owner GUIDs and short labels for the trace browser without parsing series IDs', () => {
    const chart = buildInventoryMeterCharts(meters, facilities, groups, 'meters', 'kWh', 'gal')[0];
    expect(chart.metrics.find(trace => trace.id === 'ma')).toMatchObject({ facilityGuid: 'a', facilityName: 'Plant', shortLabel: 'Electricity', kind: 'meter' });
    const grouped = buildInventoryMeterCharts(meters, facilities, groups, 'groups', 'kWh', 'gal')[0];
    expect(grouped.metrics.find(trace => trace.id === 'group:a:ga')).toMatchObject({ shortLabel: 'Production', facilityGuid: 'a', kind: 'group' });
  });
  it('aggregates only the supplied source without mutating canonical input', () => {
    const before = JSON.stringify(meters);
    const chart = buildInventoryMeterCharts(meters.slice(0,1), facilities, groups, 'facilities', 'MMBtu', 'm3')[0];
    expect(chart.rows[0].values).toEqual({ 'facility:a': 10 }); expect(JSON.stringify(meters)).toBe(before);
  });
});

import { facility, meter, reading, calendarizedMeter, monthlyData } from '../facility-meters.testing';
import { buildMeterCards } from '../models';
import { buildMeterInventory, buildMonthlyTrends, buildMeterChartStyles } from './meters-dashboard.view';

describe('facility meter dashboard projections', () => {
  const electric = meter({ guid: 'e', name: 'Main' });
  const water = meter({ guid: 'w', name: 'Main', source: 'Water Intake' });
  const month = (monthNumValue: number, energyUse = 0) => monthlyData({ monthNumValue, year: 2026, date: new Date(2026, monthNumValue, 1), energyUse, energyCost: -10, energyConsumption: 12 });

  it('aligns all charts, fills absent calendar periods with gaps, and preserves zero and negative values', () => {
    const views = buildMonthlyTrends([
      calendarizedMeter(electric, [month(0, 0), month(2, -5)]),
      calendarizedMeter(water, [month(1, 0)], { showEnergyUse: false })
    ], facility({ energyUnit: 'MMBtu', volumeLiquidUnit: 'gal' }), true);
    expect(views.map(view => view.id)).toEqual(['energy', 'water', 'cost']);
    expect(views.every(view => view.rows.length === 3)).toBe(true);
    expect(views[0].rows.map(row => row.values.e ?? null)).toEqual([0, null, -5]);
    expect(views[1].rows[1].values.w).toBe(12);
    expect(views[2].rows[0].values.e).toBe(-10);
    expect(views[0].metrics.map(item => item.id)).toEqual(['e']);
    expect(views[1].metrics.map(item => item.id)).toEqual(['w']);
    expect(views[2].metrics.map(item => item.id)).toEqual(['e', 'w']);
    expect(views[0].coverage).toBe('Jan 2026 – Mar 2026');
    expect(views[1].coverage).toBe('Feb 2026');
    expect(views[0].metrics[0].unit).toBe('MMBtu');
    expect(views[1].metrics[0].unit).toBe('gal');
    expect(views[2].metrics.every(item => item.currency)).toBe(true);
  });

  it('keeps styles stable across filtering, ordering and chart types, disambiguating duplicate names', () => {
    const items = [calendarizedMeter(electric, [month(0)]), calendarizedMeter(water, [month(0)], { showEnergyUse: false })];
    const all = buildMonthlyTrends(items, facility(), true);
    const filtered = buildMonthlyTrends([items[0]], facility(), true);
    expect(all[0].metrics[0].color).toBe(filtered[0].metrics[0].color);
    expect(all[0].metrics[0].color).toBe(all[2].metrics[0].color);
    expect(all[2].metrics[0].label).not.toBe(all[2].metrics[1].label);
    expect(buildMeterChartStyles(['e']).get('e')).toEqual(buildMeterChartStyles(['e']).get('e'));
  });

  it('assigns distinct combinations to 64 meters and retains assignments on filtering, reordering, additions and deletions', () => {
    const guids = Array.from({ length: 64 }, (_, index) => `m-${index}`);
    const styles = buildMeterChartStyles(guids);
    expect(new Set([...styles.values()].map(style => `${style.color}/${JSON.stringify(style.lineStyle)}`)).size).toBe(64);
    const next = buildMeterChartStyles(['new', ...guids.slice(1).reverse()], styles);
    for (const guid of guids.slice(1)) expect(next.get(guid)).toEqual(styles.get(guid));
  });

  it('keeps empty water panels when the facility has water meters, and omits them otherwise', () => {
    expect(buildMonthlyTrends([], facility(), true)[1]).toMatchObject({ id: 'water', metrics: [], rows: [], coverage: 'No monthly data' });
    expect(buildMonthlyTrends([], facility(), false).map(view => view.id)).toEqual(['energy', 'cost']);
  });

  it('hides all-zero cost charts across matching meters without treating gaps as costs', () => {
    const items = [
      calendarizedMeter(electric, [monthlyData({ monthNumValue: 0, energyCost: 0 }), monthlyData({ monthNumValue: 2, energyCost: 0 })]),
      calendarizedMeter(water, [monthlyData({ monthNumValue: 1, energyCost: 0 })])
    ];
    expect(buildMonthlyTrends(items, facility(), true).map(chart => chart.id)).toEqual(['energy', 'water']);
    expect(buildMonthlyTrends([items[0]], facility(), false).map(chart => chart.id)).toEqual(['energy']);
  });

  it.each([10, -10, 0.01])('keeps cost when a matching monthly value is %s', energyCost => {
    const views = buildMonthlyTrends([calendarizedMeter(electric, [monthlyData({ energyCost: 0 }), monthlyData({ monthNumValue: 1, energyCost })])], facility(), false);
    expect(views.find(chart => chart.id === 'cost')).toBeDefined();
  });

  it('retains a cost empty state when values are missing rather than zero', () => {
    const views = buildMonthlyTrends([calendarizedMeter(electric, [monthlyData({ energyCost: NaN })])], facility(), false);
    expect(views.find(chart => chart.id === 'cost')).toBeDefined();
  });

  it.each(['idle', 'evaluating', 'error', 'ready'] as const)('presents %s checks without treating unavailable checks as healthy', state => {
    const cards = buildMeterCards([electric], [reading({ meterId: electric.guid })], []);
    const entry = buildMeterInventory(cards, [], state)[0];
    expect(entry.statusLabel).toBe(state === 'ready' ? 'All data valid' : state === 'error' ? 'Checks unavailable' : 'Checks pending');
    expect(entry.tone).toBe(state === 'ready' ? 'success' : 'neutral');
  });

  it('retains active error and warning labels, search terms and attention ordering', () => {
    const cards = buildMeterCards([electric, water], [], []);
    cards[0] = { ...cards[0], statusTone: 'danger' };
    cards[1] = { ...cards[1], statusTone: 'warning' };
    const entries = buildMeterInventory(cards, [], 'ready');
    expect(entries.map(item => item.statusLabel)).toEqual(['Has errors', 'Has warnings']);
    expect(entries[0].searchText).toContain('has errors');
    expect(entries[0].attentionRank).toBeLessThan(entries[1].attentionRank);
  });
});

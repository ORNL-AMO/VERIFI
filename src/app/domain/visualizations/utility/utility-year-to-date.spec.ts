import { utilityYearToDate, utilityYearToDateRange, yearToDateIssue } from './utility-year-to-date';
import { fiscalYear } from './utility-periods';
import { latestUtilityHistoryMonth, resolveCalendarizedUtility } from './utility-calendarized';
import { utilityVisualizationFixture } from '../testing/visualization-fixtures';
import { visualizationSnapshot } from '@app/v1/visualizations/testing/visualization-test-fixtures';
import { meter, reading, calendarizedMeter, monthlyData } from '@app/v1/data/meters/facility-meters.testing';
import type { UtilityVisualizationSource } from '../visualization-definition';
import type { VisualizationSourceRequest } from '../visualization-source-provider';
import { decodeVisualizationDefinition } from '../visualization-validation';
import { serializeVisualizationDefinition } from '../visualization-source-groups';

const calendar = { fiscalYear: 'calendarYear' as const, fiscalYearMonth: 0, fiscalYearCalendarEnd: false };
describe('yearly utility Year to Date', () => {
  it.each([
    [calendar, '2026-01-31', 1, 2025, '2025-01-01', '2025-01-31'],
    [calendar, '2026-12-31', 12, 2025, '2025-01-01', '2025-12-31'],
    [calendar, '2026-02-28', 2, 2024, '2024-01-01', '2024-02-29'],
    [{ fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true }, '2025-09-30', 3, 2025, '2024-07-01', '2024-09-30'],
    [{ fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: false }, '2025-09-30', 3, 2024, '2024-07-01', '2024-09-30'],
    [{ fiscalYear: 'nonCalendarYear', fiscalYearMonth: 9, fiscalYearCalendarEnd: true }, '2026-02-28', 5, 2024, '2023-10-01', '2024-02-29']
  ] as const)('keeps equal fiscal month windows for %s at %s', (owner, anchor, months, year, start, end) => {
    const context = utilityYearToDate(anchor, owner);
    expect(context.monthCount).toBe(months);
    expect(utilityYearToDateRange(year, owner, context)).toEqual({ start, end });
  });
  it('rejects invalid cutoff dates and preserves absent defaults in serialization', () => {
    expect(() => utilityYearToDate('2026-02-30', calendar)).toThrow();
    const base = utilityVisualizationFixture();
    expect(decodeVisualizationDefinition(serializeVisualizationDefinition(base)).state).toBe('valid');
    expect(base.chart).not.toHaveProperty('yearToDate');
    expect(yearToDateIssue({ ...base, chart: { kind: 'time-series', interval: 'monthly', defaultTraceType: 'line', stack: 'none', yearToDate: true } })).toContain('yearly');
  });
  function fixture() {
    const base = visualizationSnapshot(), selected = meter({ meterReadingDataApplication: 'fullMonth', energyUnit: 'kWh' });
    const dates = [[2025, 0, 10], [2025, 1, 20], [2025, 2, 999], [2026, 0, 0], [2026, 1, 30]] as const;
    const snapshot = { ...base, account: { ...base.account, energyUnit: 'kWh', ...calendar }, facilities: base.facilities.map(facility => ({ ...facility, energyUnit: 'kWh', ...calendar })), meters: [selected], meterData: dates.map(([year, month, value], index) => reading({ guid: `bill-${index}`, year, month: month + 1, totalEnergyUse: value, totalCost: value * 2 })) };
    const projected = [calendarizedMeter(selected, dates.map(([year, monthNumValue, value]) => monthlyData({ year, fiscalYear: year, monthNumValue, date: new Date(year, monthNumValue, 1), energyUse: value, energyConsumption: value, energyCost: value * 2 })), { energyUnit: 'kWh', consumptionUnit: 'kWh' })];
    const definition = utilityVisualizationFixture({ kind: 'fixed', facilityGuids: ['facility-a'] }), source = definition.sources[0] as UtilityVisualizationSource;
    const request: VisualizationSourceRequest = { identity: { accountGuid: snapshot.account.guid, scope: { kind: 'facility', facilityGuid: 'facility-a', facilityGuids: ['facility-a'] }, workspaceRevision: 1, definitionGuid: 'chart', definitionRevision: 1, requestId: 'test', sourceId: source.id }, source, chart: { kind: 'time-series', interval: 'yearly', defaultTraceType: 'line', stack: 'none', yearToDate: true }, period: { kind: 'all-history' }, comparison: { kind: 'none' }, series: definition.series, dateContext: { calendarDate: '2040-12-31' } };
    return { snapshot, projected, request };
  }
  it('sums original monthly observations through one cutoff, including zero and partial older coverage', () => {
    const { snapshot, projected, request } = fixture();
    const result = resolveCalendarizedUtility(snapshot, request, projected);
    expect(result.state).toBe('ready'); if (result.state !== 'ready' || result.resolved.data.kind !== 'time-series') throw new Error('Expected yearly data');
    expect(result.resolved.yearToDate).toMatchObject({ anchor: '2026-02-28', monthCount: 2 });
    expect(result.resolved.data.rows.map(row => [row.start, row.end, Object.values(row.values)[0].value])).toEqual([
      ['2025-01-01', '2025-02-28', 30], ['2026-01-01', '2026-02-28', 30]
    ]);
    const gapped = { ...snapshot, meterData: snapshot.meterData.filter(item => !(item.year === 2025 && item.month === 2)) };
    const missing = resolveCalendarizedUtility(gapped, request, projected);
    if (missing.state !== 'ready' || missing.resolved.data.kind !== 'time-series') throw new Error('Expected partial data');
    expect(Object.values(missing.resolved.data.rows[0].values)[0]).toMatchObject({ value: 10, partial: true });
  });
  it.each([false, true])('rolls fiscal values and actual bounds across calendar years (end naming=%s)', endNaming => {
    const { snapshot, projected, request } = fixture();
    const fiscal = { fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: endNaming };
    const owner = { ...snapshot, facilities: snapshot.facilities.map(item => ({ ...item, ...fiscal })) };
    const result = resolveCalendarizedUtility(owner, request, projected);
    if (result.state !== 'ready' || result.resolved.data.kind !== 'time-series') throw new Error('Expected fiscal YTD');
    expect(result.resolved.yearToDate?.monthCount).toBe(8);
    expect(result.resolved.data.rows.map(row => [row.start, row.end, Object.values(row.values)[0].value])).toEqual([
      ['2024-07-01', '2025-02-28', 30], ['2025-07-01', '2026-02-28', 30]
    ]);
    expect(result.resolved.periods.map(period => period.fiscalYear)).toEqual(endNaming ? [2025, 2026] : [2024, 2025]);
  });
  it('does not anchor padding, invalid allocations or post-retirement data and accepts a saved zero', () => {
    const { snapshot, projected } = fixture();
    expect(latestUtilityHistoryMonth(snapshot, snapshot.meters, projected)).toBe('2026-02-28');
    const zero = { ...snapshot, meterData: snapshot.meterData.map(item => ({ ...item, totalEnergyUse: 0, totalCost: 0 })) };
    expect(latestUtilityHistoryMonth(zero, zero.meters, projected)).toBe('2026-02-28');
    const retired = { ...snapshot.meters[0], noLongerInUse: true, noLongerInUseYear: 2025, noLongerInUseMonth: 0 };
    expect(latestUtilityHistoryMonth(snapshot, [retired], [{ ...projected[0], meter: retired }])).toBe('2025-01-31');
    expect(latestUtilityHistoryMonth({ ...snapshot, meterData: snapshot.meterData.map(item => ({ ...item, day: 40 })) }, snapshot.meters, projected)).toBeUndefined();
  });
});

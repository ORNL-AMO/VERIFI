import { energyUseFacility, energyUseItem, energyUseSource } from '../../energy-uses.testing';
import { buildEnergyUseTreemapResults } from './energy-use-treemap-results.models';

describe('Treemap facility/account usage scope', () => {
  const facility = { ...energyUseFacility(), energyUnit: 'kWh', fiscalYear: 'calendarYear' as const };
  const item = (guid: string, facilityId: string, amount: number, unit = 'kWh') => energyUseItem({ guid, facilityId,
    utilityData: [energyUseSource({ energyUse: [{ year: 2022, energyUse: amount, energyUseUnit: unit, overrideEnergyUse: true }] })] });

  it('uses all owned equipment, common display units and saved-value carry-forward without writes', () => {
    const facilities = [facility, { ...facility, guid: 'other' }, { ...facility, guid: 'foreign', accountId: 'foreign-account' }];
    const members = [item('first', facility.guid, 10), item('converted', 'other', 36, 'MJ'), item('foreign', 'foreign', 1000),
      { ...item('foreign-account', facility.guid, 1000), accountId: 'foreign-account' }];
    const before = JSON.stringify({ facilities, members });
    const results = buildEnergyUseTreemapResults(members, facilities, facility.accountId, 2025, 'kWh');
    expect(results.accountTotal).toBeCloseTo(20, 10);
    expect(results.facilities.get('other')?.total).toBeCloseTo(10, 10);
    expect(results.rows.map(row => row.item.guid)).toEqual(['first', 'converted']);
    expect(results.rows[0].sources[0].state).toBe('carried');
    expect(JSON.stringify({ facilities, members })).toBe(before);
  });

  it('does not create an account denominator across different actual fiscal periods', () => {
    const other = { ...facility, guid: 'other', fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: true };
    const results = buildEnergyUseTreemapResults([item('first', facility.guid, 10), item('second', 'other', 20)], [facility, other], facility.accountId, 2025, 'kWh');
    expect(results.accountComparable).toBe(false); expect(results.accountTotal).toBeNull();
    expect(results.facilities.get(facility.guid)?.total).toBe(10);
    expect(results.facilities.get('other')?.total).toBe(20);
  });

  it('preserves zero totals and flags partial/invalid source and calendar coverage', () => {
    const invalid = { ...facility, guid: 'invalid', fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 99 };
    const results = buildEnergyUseTreemapResults([item('zero', facility.guid, 0), item('invalid-amount', facility.guid, NaN), item('invalid-calendar', 'invalid', 20)],
      [facility, invalid], facility.accountId, 2025, 'kWh');
    expect(results.facilities.get(facility.guid)).toMatchObject({ total: 0, partial: true });
    expect(results.accountPartial).toBe(true); expect(results.accountTotal).toBeNull();
    expect(results.rows).toHaveLength(2);
  });
});

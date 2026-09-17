import { calendarizedMeter, facility, meter, monthlyData } from '../facility-meters.testing';
import { MeterGroupResultRow } from './meter-group-results.models';
import { buildMeterUsageFacts, buildMeterUsageFactsFromCalendarizedMeters } from './meter-usage.models';

describe('meter usage models', () => {
  it('calculates rolling usage facts and percent change for a complete latest and previous 12-month window', () => {
    const rows = [
      ...usageRows(2025, 1, 12, 100),
      ...usageRows(2026, 1, 12, 110)
    ];

    const facts = buildMeterUsageFacts(rows, { useConsumption: false, unit: 'MMBtu' });

    expect(facts.unitLabel).toBe('MMBtu');
    expect(facts.facts).toEqual([
      expect.objectContaining({ id: 'latest-month', label: 'Dec 2026', valueLabel: '110', unavailable: false, changeLabel: '+10% vs same month last year', changeTone: 'increase' }),
      expect.objectContaining({ id: 'previous-year-month', label: 'Dec 2025', valueLabel: '100', unavailable: false }),
      expect.objectContaining({ id: 'latest-twelve-month-average', label: 'AVG. Jan 2026 - Dec 2026', valueLabel: '110', unavailable: false, changeLabel: '+10% vs previous 12 mo', changeTone: 'increase' }),
      expect.objectContaining({ id: 'previous-twelve-month-average', label: 'AVG. Jan 2025 - Dec 2025', valueLabel: '100', unavailable: false })
    ]);
  });

  it('keeps rolling comparison facts unavailable when the previous 12-month window is incomplete', () => {
    const facts = buildMeterUsageFacts(usageRows(2025, 1, 13, 100), { useConsumption: false, unit: 'kWh' });

    expect(facts.facts.find(fact => fact.id === 'latest-twelve-month-average')).toMatchObject({
      label: 'AVG. Feb 2025 - Jan 2026',
      valueLabel: '100',
      unavailable: false,
      changeLabel: 'Change not available',
      changeTone: 'unavailable'
    });
    expect(facts.facts.find(fact => fact.id === 'previous-twelve-month-average')).toMatchObject({
      valueLabel: 'Not available',
      unavailable: true
    });
  });

  it('keeps the same-month previous-year fact unavailable when that month is missing', () => {
    const facts = buildMeterUsageFacts(usageRows(2025, 2, 12, 100), { useConsumption: false, unit: 'kWh' });

    expect(facts.facts.find(fact => fact.id === 'latest-month')).toMatchObject({
      label: 'Jan 2026',
      valueLabel: '100',
      unavailable: false,
      changeLabel: 'Change not available',
      changeTone: 'unavailable'
    });
    expect(facts.facts.find(fact => fact.id === 'previous-year-month')).toMatchObject({
      valueLabel: 'Not available',
      unavailable: true
    });
  });

  it('keeps percent change unavailable when the previous 12-month average is zero', () => {
    const rows = [
      ...usageRows(2025, 1, 12, 0),
      ...usageRows(2026, 1, 12, 10)
    ];

    const facts = buildMeterUsageFacts(rows, { useConsumption: false, unit: 'kWh' });

    expect(facts.facts.find(fact => fact.id === 'previous-twelve-month-average')).toMatchObject({
      valueLabel: '0',
      unavailable: false
    });
    expect(facts.facts.find(fact => fact.id === 'latest-twelve-month-average')).toMatchObject({
      changeLabel: 'Change not available',
      changeTone: 'unavailable'
    });
  });

  it('uses calendarized consumption and consumption units for non-energy meter facts', () => {
    const waterMeter = meter({ guid: 'meter-water', source: 'Water Intake' });

    const facts = buildMeterUsageFactsFromCalendarizedMeters([
      calendarizedMeter(waterMeter, [
        monthlyData({ energyUse: 999, energyConsumption: 14 })
      ], { showEnergyUse: false, consumptionUnit: 'kgal' })
    ], facility({ energyUnit: 'MMBtu' }));

    expect(facts.unitLabel).toBe('kgal');
    expect(facts.facts[0]).toMatchObject({
      valueLabel: '14',
      unavailable: false
    });
  });
});

function usageRows(startYear: number, startMonth: number, count: number, energyUse: number): MeterGroupResultRow[] {
  return Array.from({ length: count }, (_, index) => {
    const monthIndex = startYear * 12 + startMonth + index;
    const year = Math.floor((monthIndex - 1) / 12);
    const month = ((monthIndex - 1) % 12) + 1;
    return resultRow(year, month, energyUse);
  });
}

function resultRow(year: number, month: number, energyUse: number, energyConsumption = 0): MeterGroupResultRow {
  const date = new Date(year, month - 1, 1);
  return {
    periodKey: `${year}-${month - 1}`,
    periodLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    sortValue: date.getTime(),
    fiscalYear: year,
    energyUse,
    energyConsumption,
    energyCost: 0
  };
}

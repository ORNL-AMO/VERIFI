import { MeterStatusCheck } from '@domain/calculations/status-check-calculations/meterStatusCheck';
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import {
  buildMeterCards,
  buildMeterGroupResultsView,
  buildMeterUsageFacts,
  buildMeterUsageFactsFromCalendarizedMeters,
  formatMeterGroupPeriodLabel,
  MeterGroupResultRow
} from './facility-meters.models';
import { facility, group, meter, reading } from './facility-meters.testing';

describe('facility meter view models', () => {
  it('labels good meter status as valid for browse cards', () => {
    const cards = buildMeterCards(
      [meter({ guid: 'meter-electric', name: 'Electric Main' })],
      [reading({ meterId: 'meter-electric', month: 1, year: 2026 })],
      [],
      [
        {
          meterId: 'meter-electric',
          status: 'good',
          lastDateEntry: new Date(2026, 0, 1),
          hasNoData: false,
          actions: []
        } as MeterStatusCheck
      ]
    );

    expect(cards[0].statusLabel).toBe('Valid');
    expect(cards[0].statusTone).toBe('success');
    expect(cards[0].firstReadingLabel).toBe('Jan 2026');
    expect(cards[0].latestReadingLabel).toBe('Jan 2026');
  });

  it('labels the earliest and latest meter readings for browse cards', () => {
    const cards = buildMeterCards(
      [meter({ guid: 'meter-electric', name: 'Electric Main' })],
      [
        reading({ meterId: 'meter-electric', month: 3, year: 2026 }),
        reading({ meterId: 'meter-electric', month: 12, year: 2025 }),
        reading({ meterId: 'meter-electric', month: 1, year: 2026 })
      ],
      []
    );

    expect(cards[0].firstReadingLabel).toBe('Dec 2025');
    expect(cards[0].latestReadingLabel).toBe('Mar 2026');
  });

  it('adds calendarized usage facts to matching meter browse cards', () => {
    const electricMeter = meter({ guid: 'meter-electric', name: 'Electric Main' });
    const waterMeter = meter({ guid: 'meter-water', name: 'City Water', source: 'Water Intake' });

    const cards = buildMeterCards(
      [electricMeter, waterMeter],
      [],
      [],
      [],
      facility({ energyUnit: 'MMBtu' }),
      [
        calendarizedMeter(electricMeter, [
          monthlyData({ year: 2025, monthNumValue: 12, energyUse: 100 }),
          monthlyData({ year: 2026, monthNumValue: 12, energyUse: 110 })
        ], { energyUnit: 'MMBtu' })
      ]
    );

    const electricFacts = cards.find(card => card.meter.guid === 'meter-electric')?.usageFacts;
    expect(electricFacts?.unitLabel).toBe('MMBtu');
    expect(electricFacts?.facts[0]).toMatchObject({
      id: 'latest-month',
      label: 'Dec 2026',
      valueLabel: '110',
      changeLabel: '+10% vs same month last year'
    });
    expect(cards.find(card => card.meter.guid === 'meter-water')?.usageFacts).toBeUndefined();
  });

  it('aggregates meter group monthly and fiscal-year result rows', () => {
    const electricGroup = group({ guid: 'group-electric', name: 'Electric Group', groupType: 'Energy' });
    const electricMeter = meter({ guid: 'meter-electric', name: 'Electric Main', groupId: 'group-electric' });
    const view = buildMeterGroupResultsView(
      electricGroup,
      facility({ energyUnit: 'MMBtu' }),
      [{
        id: electricGroup.guid,
        label: electricGroup.name,
        tone: 'energy',
        group: electricGroup,
        meters: [{
          meter: electricMeter,
          group: electricGroup,
          readingCount: 2
        }]
      }],
      [
        calendarizedMeter(electricMeter, [
          monthlyData({ year: 2025, monthNumValue: 12, fiscalYear: 2026, energyUse: 10, energyCost: 20 }),
          monthlyData({ year: 2026, monthNumValue: 1, fiscalYear: 2026, energyUse: 30, energyCost: 40 })
        ]),
        calendarizedMeter(electricMeter, [
          monthlyData({ year: 2026, monthNumValue: 1, fiscalYear: 2026, energyUse: 5, energyCost: 7 })
        ])
      ]
    );

    expect(view.showEnergyUse).toBe(true);
    expect(view.showConsumption).toBe(false);
    expect(view.showCost).toBe(true);
    expect(view.monthlyRows).toHaveLength(2);
    expect(view.monthlyRows[1]).toMatchObject({ energyUse: 35, energyCost: 47 });
    expect(view.yearlyRows).toHaveLength(1);
    expect(view.yearlyRows[0]).toMatchObject({ fiscalYear: 2026, energyUse: 45, energyCost: 67 });
    expect(formatMeterGroupPeriodLabel(view.yearlyRows[0], 'yearly')).toBe('FY 2026');
    expect(view.summary.assignedMeterCount).toBe(1);
    expect(view.summary.firstDataLabel).toBe('Dec 2025');
    expect(view.summary.latestDataLabel).toBe('Jan 2026');
    expect(view.usageFacts.unitLabel).toBe('MMBtu');
    expect(view.usageFacts.facts[0].valueLabel).toBe('35');
  });

  it('uses consumption as the utility value for water groups', () => {
    const waterGroup = group({ guid: 'group-water', groupType: 'Water' });
    const waterMeter = meter({ guid: 'meter-water', source: 'Water Intake', groupId: waterGroup.guid });
    const view = buildMeterGroupResultsView(
      waterGroup,
      facility({ volumeLiquidUnit: 'kgal' }),
      [{
        id: waterGroup.guid,
        label: waterGroup.name,
        tone: 'water',
        group: waterGroup,
        meters: [{ meter: waterMeter, group: waterGroup, readingCount: 1 }]
      }],
      [
        calendarizedMeter(waterMeter, [
          monthlyData({ energyConsumption: 14, energyUse: 0, energyCost: 0 })
        ])
      ]
    );

    expect(view.showEnergyUse).toBe(false);
    expect(view.showConsumption).toBe(true);
    expect(view.showCost).toBe(false);
    expect(view.utilityLabel).toBe('Total Consumption');
    expect(view.utilityUnit).toBe('kgal');
    expect(view.summary.utilityTotalValue).toBe(14);
    expect(view.usageFacts.unitLabel).toBe('kgal');
    expect(view.usageFacts.facts[0].valueLabel).toBe('14');
  });

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
    const rows = usageRows(2025, 1, 13, 100);

    const facts = buildMeterUsageFacts(rows, { useConsumption: false, unit: 'kWh' });

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
    const rows = usageRows(2025, 2, 12, 100);

    const facts = buildMeterUsageFacts(rows, { useConsumption: false, unit: 'kWh' });

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

function calendarizedMeter(
  meterValue: ReturnType<typeof meter>,
  monthlyDataValue: MonthlyData[],
  options: Partial<CalanderizedMeter> = {}
): CalanderizedMeter {
  return {
    meter: meterValue,
    consumptionUnit: options.consumptionUnit ?? 'kgal',
    monthlyData: monthlyDataValue,
    showConsumption: options.showConsumption ?? true,
    showEnergyUse: options.showEnergyUse ?? true,
    showElectricalEmissions: false,
    showOtherScope2Emissions: false,
    showStationaryEmissions: false,
    showFugitiveEmissions: false,
    showProcessEmissions: false,
    showMobileEmissions: false,
    energyUnit: options.energyUnit ?? 'MMBtu',
    energyIsSource: false,
    ...options
  };
}

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
    periodKey: `${year}-${month}`,
    periodLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    sortValue: date.getTime(),
    fiscalYear: year,
    energyUse,
    energyConsumption,
    energyCost: 0
  };
}

function monthlyData(options: Partial<MonthlyData> = {}): MonthlyData {
  const year = options.year ?? 2026;
  const monthNumValue = options.monthNumValue ?? 1;
  return {
    month: options.month ?? 'January',
    monthNumValue,
    year,
    fiscalYear: options.fiscalYear ?? year,
    energyConsumption: options.energyConsumption ?? 0,
    energyUse: options.energyUse ?? 0,
    energyCost: options.energyCost ?? 0,
    date: options.date ?? new Date(year, monthNumValue - 1, 1),
    readingType: options.readingType ?? 'metered',
    ...options
  } as MonthlyData;
}

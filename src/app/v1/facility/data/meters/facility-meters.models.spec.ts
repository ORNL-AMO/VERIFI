import { MeterStatusCheck } from '@domain/calculations/status-check-calculations/meterStatusCheck';
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { buildMeterCards, buildMeterGroupResultsView, formatMeterGroupPeriodLabel } from './facility-meters.models';
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
  });
});

function calendarizedMeter(meterValue: ReturnType<typeof meter>, monthlyDataValue: MonthlyData[]): CalanderizedMeter {
  return {
    meter: meterValue,
    consumptionUnit: 'kgal',
    monthlyData: monthlyDataValue,
    showConsumption: true,
    showEnergyUse: true,
    showElectricalEmissions: false,
    showOtherScope2Emissions: false,
    showStationaryEmissions: false,
    showFugitiveEmissions: false,
    showProcessEmissions: false,
    showMobileEmissions: false,
    energyUnit: 'MMBtu',
    energyIsSource: false
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

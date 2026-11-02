import { calendarizedMeter, facility, group, meter, monthlyData } from '../facility-meters.testing';
import { buildMeterGroupResultsView, formatMeterGroupPeriodLabel } from './meter-group-results.models';

describe('meter group results models', () => {
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
        meters: [{ meter: electricMeter, group: electricGroup, readingCount: 2 }]
      }],
      [
        calendarizedMeter(electricMeter, [
          monthlyData({ year: 2025, monthNumValue: 11, fiscalYear: 2026, energyUse: 10, energyCost: 20 }),
          monthlyData({ year: 2026, monthNumValue: 0, fiscalYear: 2026, energyUse: 30, energyCost: 40 })
        ]),
        calendarizedMeter(electricMeter, [
          monthlyData({ year: 2026, monthNumValue: 0, fiscalYear: 2026, energyUse: 5, energyCost: 7 })
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
      [calendarizedMeter(waterMeter, [
        monthlyData({ energyConsumption: 14, energyUse: 0, energyCost: 0 })
      ])]
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
});

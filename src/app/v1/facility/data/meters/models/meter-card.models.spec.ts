import { MeterStatusCheck } from '@domain/calculations/status-check-calculations/meterStatusCheck';
import { calendarizedMeter, facility, meter, monthlyData, reading } from '../facility-meters.testing';
import { buildMeterCards, meterSourceIcon } from './meter-card.models';

describe('meter card models', () => {
  it('maps meter sources to semantic v1 icons', () => {
    expect([
      meterSourceIcon('Electricity'),
      meterSourceIcon('Natural Gas'),
      meterSourceIcon('Other Fuels'),
      meterSourceIcon('Other Energy'),
      meterSourceIcon('Water Intake'),
      meterSourceIcon('Water Discharge'),
      meterSourceIcon('Other')
    ]).toEqual([
      'electricity',
      'naturalGas',
      'otherFuel',
      'otherEnergy',
      'waterIntake',
      'waterDischarge',
      'meter'
    ]);
  });

  it('labels good meter status as valid for browse cards', () => {
    const cards = buildMeterCards(
      [meter({ guid: 'meter-electric', name: 'Electric Main' })],
      [reading({ meterId: 'meter-electric', month: 1, year: 2026 })],
      [],
      [{
        meterId: 'meter-electric',
        status: 'good',
        lastDateEntry: new Date(2026, 0, 1),
        hasNoData: false,
        actions: []
      } as MeterStatusCheck]
    );

    expect(cards[0].statusLabel).toBe('Valid');
    expect(cards[0].statusTone).toBe('success');
    expect(cards[0].sourceIcon).toBe('electricity');
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
      [calendarizedMeter(electricMeter, [
        monthlyData({ year: 2025, monthNumValue: 11, energyUse: 100 }),
        monthlyData({ year: 2026, monthNumValue: 11, energyUse: 110 })
      ], { energyUnit: 'MMBtu' })]
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
});

import { MeterStatusCheck } from '@domain/calculations/status-check-calculations/meterStatusCheck';
import { buildMeterCards } from './facility-meters.models';
import { meter, reading } from './facility-meters.testing';

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
});

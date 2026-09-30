import { getNewIdbUtilityMeter, IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getImportMeterIssues, isImportMeterValid } from './meter-import-review';

describe('meter import review', () => {
  it('requires complete settings and a calendarization method', () => {
    const meter = validMeter();
    expect(isImportMeterValid(meter)).toBe(true);

    meter.meterReadingDataApplication = undefined;
    meter.name = '';

    expect(isImportMeterValid(meter)).toBe(false);
    expect(getImportMeterIssues(meter)).toEqual([
      'Meter settings are incomplete or invalid.',
      'Choose a calendarization method.'
    ]);
  });

  it('requires vehicle collection units and fuel', () => {
    const meter = validMeter({
      scope: 2,
      vehicleCategory: 1,
      vehicleCollectionUnit: undefined,
      vehicleFuel: undefined
    });

    expect(getImportMeterIssues(meter)).toContain('Vehicle collection units and fuel are required.');
  });
});

function validMeter(overrides: Partial<IdbUtilityMeter> = {}): IdbUtilityMeter {
  return {
    ...getNewIdbUtilityMeter('facility-a', 'account-a', false, 'MMBtu'),
    name: 'Electricity',
    source: 'Electricity',
    startingUnit: 'kWh',
    energyUnit: 'MMBtu',
    meterReadingDataApplication: 'backward',
    ...overrides
  };
}

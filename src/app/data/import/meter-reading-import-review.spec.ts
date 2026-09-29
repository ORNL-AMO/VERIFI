import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import {
  buildImportMeterReadingReview,
  getImportMeterReadingIssues,
  isImportMeterReadingValid
} from './meter-reading-import-review';

describe('meter reading import review', () => {
  it('classifies included readings and prepares ranges, issues, and comparisons', () => {
    const included = meter({ guid: 'meter-a' });
    const skipped = meter({ guid: 'meter-b', skipImport: true });
    const current = reading({ guid: 'current', meterId: included.guid, month: 1, totalEnergyUse: 10, totalCost: 4 });
    const overlapping = reading({ guid: 'overlap', meterId: included.guid, month: 1, totalEnergyUse: 15, totalCost: 6 });
    const newReading = reading({ guid: 'new', meterId: included.guid, month: 2, totalEnergyUse: 20 });
    const invalid = reading({ guid: 'invalid', meterId: included.guid, month: 3, totalEnergyUse: Number.NaN });
    const laterReading = reading({ guid: 'new-later', meterId: included.guid, month: 4, totalEnergyUse: 25 });
    const skippedReading = reading({ guid: 'skipped', meterId: skipped.guid, month: 4 });

    const rows = buildImportMeterReadingReview({
      meters: [included, skipped],
      readings: [overlapping, newReading, invalid, laterReading, skippedReading],
      facilities: [facility()],
      currentReadings: [current],
      excludedReadingIds: [invalid.guid],
      skipExistingMeterIds: [included.guid]
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      facilityName: 'Main Plant',
      keepExisting: true,
      primaryUnit: 'kWh',
      newReadings: { count: 2 },
      invalidReadings: { count: 1 },
      existingReadings: { count: 1 }
    });
    expect(rows[0].newReadings.start?.getMonth()).toBe(1);
    expect(rows[0].newReadings.end?.getMonth()).toBe(3);
    expect(rows[0].existingReadings.start?.getMonth()).toBe(0);
    expect(rows[0].invalidReadingDetails[0]).toMatchObject({
      index: 2,
      key: invalid.guid,
      excluded: true,
      messages: ['Energy use must be a number.']
    });
    expect(rows[0].comparisons[0]).toMatchObject({
      currentValue: 10,
      importedValue: 15,
      difference: 5,
      percentageDifference: 50,
      changedFields: ['Total cost']
    });
  });

  it('compares every user-facing value while ignoring equivalent missing values', () => {
    const electricity = meter({
      charges: [{ guid: 'charge-a', name: 'Delivery fee', chargeType: 'flatFee', displayChargeInTable: true, displayUsageInTable: true }]
    });
    const current = reading({
      guid: 'current', totalEnergyUse: 0, totalBilledDemand: 4, heatCapacity: undefined,
      charges: [{ chargeGuid: 'charge-a', chargeAmount: 2, chargeUsage: 1 }]
    });
    const imported = reading({
      guid: 'imported', totalEnergyUse: 5, totalBilledDemand: 7, heatCapacity: null as any,
      charges: [{ chargeGuid: 'charge-a', chargeAmount: 3, chargeUsage: 1 }]
    });

    const comparison = buildImportMeterReadingReview({
      meters: [electricity], readings: [imported], facilities: [facility()], currentReadings: [current],
      excludedReadingIds: [], skipExistingMeterIds: []
    })[0].comparisons[0];

    expect(comparison.difference).toBe(5);
    expect(comparison.percentageDifference).toBeUndefined();
    expect(comparison.changedFields).toEqual(['Billed demand', 'Delivery fee amount']);
    expect(comparison.changedFields).not.toContain('Heat capacity');
  });

  it.each([
    { name: 'volume meter', meter: meter({ source: 'Natural Gas', startingUnit: 'CCF', scope: 1 }), unit: 'CCF', value: 12 },
    { name: 'vehicle fuel', meter: meter({ scope: 2, vehicleCollectionType: 1, vehicleCollectionUnit: 'gal' }), unit: 'gal', value: 12 },
    { name: 'vehicle distance', meter: meter({ scope: 2, vehicleCollectionType: 2, vehicleDistanceUnit: 'mi' }), unit: 'mi', value: 12 }
  ])('uses the source-input quantity for $name', ({ meter: selectedMeter, unit, value }) => {
    const current = reading({ guid: 'current', meterId: selectedMeter.guid, totalVolume: 10, totalEnergyUse: 100 });
    const imported = reading({ guid: 'imported', meterId: selectedMeter.guid, totalVolume: value, totalEnergyUse: 100 });

    const row = buildImportMeterReadingReview({
      meters: [selectedMeter], readings: [imported], facilities: [facility()], currentReadings: [current],
      excludedReadingIds: [], skipExistingMeterIds: []
    })[0];

    expect(row.primaryUnit).toBe(unit);
    expect(row.comparisons[0]).toMatchObject({ currentValue: 10, importedValue: value, difference: 2 });
  });

  it('preserves the existing import validity contract and reports field-specific issues', () => {
    const valid = reading({ totalEnergyUse: '12' as any });
    const invalid = reading({ year: 1900, month: 13, day: 0, totalVolume: 'not-a-number' as any });

    expect(isImportMeterReadingValid(valid)).toBe(true);
    expect(isImportMeterReadingValid(invalid)).toBe(false);
    expect(getImportMeterReadingIssues(invalid)).toEqual([
      'Year must be a whole number after 1900.',
      'Month must be between 1 and 12.',
      'Day must be between 1 and 31.',
      'Total volume must be a number.'
    ]);
  });
});

function facility(): IdbFacility {
  return { guid: 'facility-a', accountId: 'account-a', name: 'Main Plant' } as IdbFacility;
}

function meter(values: Partial<IdbUtilityMeter> = {}): IdbUtilityMeter {
  return {
    guid: 'meter-a', facilityId: 'facility-a', accountId: 'account-a', name: 'Electricity',
    source: 'Electricity', scope: 3, startingUnit: 'kWh', energyUnit: 'kWh', charges: [], skipImport: false,
    ...values
  } as IdbUtilityMeter;
}

function reading(values: Partial<IdbUtilityMeterData> = {}): IdbUtilityMeterData {
  return {
    guid: 'reading-a', meterId: 'meter-a', facilityId: 'facility-a', accountId: 'account-a',
    year: 2026, month: 1, day: 1, totalEnergyUse: 10, totalCost: undefined, checked: false,
    ...values
  } as IdbUtilityMeterData;
}

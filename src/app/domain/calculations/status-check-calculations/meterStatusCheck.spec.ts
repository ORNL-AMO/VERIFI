import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { MeterStatusCheck } from './meterStatusCheck';

describe('MeterStatusCheck', () => {
  it('keeps a backward-calendarized meter as a warning and distinguishes its bill date from complete month', () => {
    const meter = createMeter({ meterReadingDataApplication: 'backward' });
    const readings = [createReading(15, 8, 2026)];
    const calendarizedMeter = createCalendarizedMeter(meter, 6, 2026);

    const check = new MeterStatusCheck(meter, readings, calendarizedMeter, { month: 8, year: 2026 }, false);

    expect(check.status).toBe('warning');
    expect(check.isDataOutdated).toBe(false);
    expect(check.lastRawReadingDate).toEqual(new Date(2026, 7, 15));
    expect(check.actions.at(-1)?.description).toBe(
      'Facility calculations are complete through August 2026. This meter is complete through July 2026. Latest bill entered: August 15, 2026.'
    );
  });

  it('uses outdated status only when time-based staleness is enabled', () => {
    const meter = createMeter({ meterReadingDataApplication: 'fullMonth' });
    const readings = [createReading(1, 1, 2020)];
    const calendarizedMeter = createCalendarizedMeter(meter, 0, 2020);

    const disabled = new MeterStatusCheck(meter, readings, calendarizedMeter, { month: 1, year: 2020 }, false);
    const enabled = new MeterStatusCheck(meter, readings, calendarizedMeter, { month: 1, year: 2020 }, true, 3);

    expect(disabled.status).toBe('good');
    expect(enabled.status).toBe('outdated');
  });

  it('does not warn for date checks that are ignored or stop at a meter end date', () => {
    const ignoredMeter = createMeter({ ignoreDateStatusChecks: true });
    const stoppedMeter = createMeter({
      guid: 'stopped-meter',
      noLongerInUse: true,
      noLongerInUseMonth: 6,
      noLongerInUseYear: 2026
    });
    const readings = [createReading(1, 7, 2026)];

    const ignored = new MeterStatusCheck(ignoredMeter, readings, createCalendarizedMeter(ignoredMeter, 6, 2026), { month: 8, year: 2026 }, false);
    const stopped = new MeterStatusCheck(stoppedMeter, readings, createCalendarizedMeter(stoppedMeter, 6, 2026), { month: 8, year: 2026 }, false);

    expect(ignored.status).toBe('good');
    expect(stopped.status).toBe('good');
  });
});

function createMeter(overrides: Partial<IdbUtilityMeter> = {}): IdbUtilityMeter {
  return {
    guid: 'meter-a',
    facilityId: 'facility-a',
    accountId: 'account-a',
    groupId: 'group-a',
    meterNumber: '1',
    accountNumber: 1,
    siteToSource: 1,
    name: 'Gas Meter',
    supplier: 'Utility',
    source: 'Natural Gas',
    startingUnit: 'MMBtu',
    energyUnit: 'MMBtu',
    meterReadingDataApplication: 'fullMonth',
    scope: 1,
    agreementType: 1,
    includeInEnergy: true,
    retainRECs: false,
    directConnection: false,
    recsMultiplier: 0,
    greenPurchaseFraction: 0,
    marketGHGMultiplier: 1,
    locationGHGMultiplier: 1,
    charges: [],
    ...overrides
  };
}

function createReading(day: number, month: number, year: number): IdbUtilityMeterData {
  return {
    guid: `reading-${year}-${month}-${day}`,
    meterId: 'meter-a',
    facilityId: 'facility-a',
    accountId: 'account-a',
    createdDate: new Date(year, month - 1, day),
    modifiedDate: new Date(year, month - 1, day),
    day,
    month,
    year,
    migratedDates: true,
    totalEnergyUse: 100,
    totalCost: 10,
    checked: false
  };
}

function createCalendarizedMeter(meter: IdbUtilityMeter, monthNumValue: number, year: number): CalanderizedMeter {
  const monthlyData = [{
    month: '',
    monthNumValue,
    year,
    fiscalYear: year,
    energyConsumption: 100,
    energyUse: 100,
    energyCost: 10,
    date: new Date(year, monthNumValue, 1),
    readingType: 'metered'
  } as MonthlyData];
  return { meter, monthlyData } as CalanderizedMeter;
}

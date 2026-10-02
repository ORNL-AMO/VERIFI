import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';

describe('calendarization worker contract in Chromium', () => {
  it('calendarizes a structured-cloneable payload and result', async () => {
    const payload = structuredClone({
      account: {
        guid: 'account-a',
        energyUnit: 'MMBtu',
        energyIsSource: false,
        fiscalYear: 'calendarYear',
        assessmentReportVersion: 'AR6'
      },
      meters: [{
        guid: 'meter-a',
        accountId: 'account-a',
        facilityId: 'facility-a',
        name: 'Gas Meter',
        source: 'Natural Gas',
        startingUnit: 'MMBtu',
        energyUnit: 'MMBtu',
        meterReadingDataApplication: 'fullMonth',
        includeInEnergy: true,
        siteToSource: 1,
        scope: 1,
        retainRECs: false,
        recsMultiplier: 0,
        greenPurchaseFraction: 0,
        marketGHGMultiplier: 1,
        locationGHGMultiplier: 1
      }],
      meterData: [{
        guid: 'reading-a',
        accountId: 'account-a',
        facilityId: 'facility-a',
        meterId: 'meter-a',
        day: 1,
        month: 8,
        year: 2026,
        totalEnergyUse: 100,
        totalCost: 25,
        checked: false,
        migratedDates: true,
        isEstimated: false
      }],
      facilities: [{ guid: 'facility-a', accountId: 'account-a' }]
    });

    const calanderizedMeters = getCalanderizedMeterData(
      payload.meters as any,
      payload.meterData as any,
      payload.account as any,
      false,
      undefined,
      [],
      [],
      payload.facilities as any,
      'AR6',
      []
    );
    const clonedResult = await roundTripThroughMessageChannel(calanderizedMeters);

    expect(clonedResult).toHaveLength(1);
    expect(clonedResult[0].meter.guid).toBe('meter-a');
    expect(clonedResult[0].monthlyData).toHaveLength(1);
    expect(clonedResult[0].monthlyData[0].energyUse).toBe(100);
  });
});

function roundTripThroughMessageChannel<T>(value: T): Promise<T> {
  const channel = new MessageChannel();
  return new Promise<T>(resolve => {
    channel.port1.onmessage = event => resolve(event.data);
    channel.port2.postMessage(value);
  }).finally(() => {
    channel.port1.close();
    channel.port2.close();
  });
}

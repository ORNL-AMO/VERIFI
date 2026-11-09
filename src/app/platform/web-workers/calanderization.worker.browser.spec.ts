import { firstValueFrom } from 'rxjs';
import { CalanderizedMeter } from '@data/models/calanderization';
import { runWorker } from './run-worker';

interface CalendarizationWorkerResult {
  calanderizedMeters?: Array<CalanderizedMeter>;
  error: boolean;
  message?: string;
}

describe('calendarization worker contract in Chromium', () => {
  it('accepts the production request and returns calendarized values in the response envelope', async () => {
    const payload = structuredClone({
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
      allMeterData: [{
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
      accountOrFacility: {
        guid: 'account-a',
        energyUnit: 'MMBtu',
        energyIsSource: false,
        fiscalYear: 'calendarYear',
        assessmentReportVersion: 'AR6'
      },
      monthDisplayShort: false,
      calanderizationOptions: undefined,
      co2Emissions: [],
      customFuels: [],
      facilities: [{ guid: 'facility-a', accountId: 'account-a' }],
      assessmentReportVersion: 'AR6',
      customGWPs: []
    });

    const response = await runProductionWorker(payload);

    expect(response.error, response.message).toBe(false);
    expect(response.calanderizedMeters).toHaveLength(1);
    expect(response.calanderizedMeters?.[0].meter.guid).toBe('meter-a');
    expect(response.calanderizedMeters?.[0].monthlyData).toHaveLength(1);
    expect(response.calanderizedMeters?.[0].monthlyData[0].energyUse).toBe(100);
  });

  it('returns the production error envelope for an invalid request', async () => {
    const response = await runProductionWorker({
      meters: undefined,
      allMeterData: [],
      accountOrFacility: {},
      monthDisplayShort: false,
      calanderizationOptions: undefined,
      co2Emissions: [],
      customFuels: [],
      facilities: [],
      assessmentReportVersion: 'AR6',
      customGWPs: []
    });

    expect(response).toEqual({
      calanderizedMeters: undefined,
      error: true,
      message: expect.any(String)
    });
  });
});

async function runProductionWorker(payload: unknown): Promise<CalendarizationWorkerResult> {
  const workerUrl = new URL('./calanderization.worker', import.meta.url);
  const workerResponse = await fetch(workerUrl);
  expect(workerResponse.ok, `${workerResponse.status} ${workerUrl}`).toBe(true);
  const worker = new Worker(workerUrl, { type: 'module' });
  const terminate = vi.spyOn(worker, 'terminate');
  try {
    let response: CalendarizationWorkerResult;
    try {
      response = await firstValueFrom(runWorker<CalendarizationWorkerResult>(worker, payload));
    } catch (error) {
      if (error instanceof ErrorEvent) {
        throw new Error(`${error.message} (${error.filename}:${error.lineno}:${error.colno})`);
      }
      throw error;
    }
    expect(terminate).toHaveBeenCalledOnce();
    return response;
  } finally {
    if (!terminate.mock.calls.length) worker.terminate();
  }
}

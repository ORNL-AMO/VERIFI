import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CalanderizedMeter } from '@data/models/calanderization';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { group, meter, reading } from './facility-meters.testing';
import { FacilityMetersWorkspaceService } from './facility-meters-workspace.service';

describe('FacilityMetersWorkspaceService', () => {
  let originalWorker: typeof Worker | undefined;

  beforeEach(() => {
    originalWorker = globalThis.Worker;
  });

  afterEach(() => {
    FakeWorker.instances = [];
    if (originalWorker) {
      globalThis.Worker = originalWorker;
    } else {
      delete (globalThis as unknown as { Worker?: typeof Worker }).Worker;
    }
  });

  it('exposes selected meter context from the current meter route', () => {
    const events = new Subject<unknown>();
    const meters = signal([
      meter({ guid: 'meter-a', name: 'Electric Main', groupId: 'group-a' }),
      meter({ guid: 'meter-b', name: 'Water Main', groupId: undefined, source: 'Water Intake' })
    ]);
    const meterData = signal([
      reading({ guid: 'reading-a', meterId: 'meter-a' }),
      reading({ guid: 'reading-b', meterId: 'meter-a' })
    ]);
    const meterGroups = signal([
      group({ guid: 'group-a', name: 'Purchased Electricity' })
    ]);

    TestBed.configureTestingModule({
      providers: [
        FacilityMetersWorkspaceService,
        {
          provide: Router,
          useValue: {
            url: '/v1/workspace/facility/facility-a/data/meters/meter-a/monthly',
            events
          }
        },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account: signal({ guid: 'account-a', name: 'Account A' }),
            selectedFacility: signal({ guid: 'facility-a', name: 'Facility A' }),
            canWrite: signal(true),
            hasPending: signal(false),
            facilityMeters: meters,
            facilityMeterData: meterData,
            facilityMeterGroups: meterGroups
          }
        },
        {
          provide: AccountStatusCheckService,
          useValue: {
            selectedFacilityStatusCheck$: of({ metersStatusChecks: [] })
          }
        }
      ]
    });

    const service = TestBed.inject(FacilityMetersWorkspaceService);

    expect(service.selectedMeterGuid()).toBe('meter-a');
    expect(service.selectedMeter()?.name).toBe('Electric Main');
    expect(service.selectedMeterCard()?.meter.guid).toBe('meter-a');
    expect(service.selectedMeterCard()?.firstReadingLabel).toBe('Jan 2026');
    expect(service.selectedMeterGroup()?.name).toBe('Purchased Electricity');
    expect(service.selectedMeterReadingCount()).toBe(2);

    events.next(new NavigationEnd(
      1,
      '/v1/workspace/facility/facility-a/data/meters/meter-b/settings',
      '/v1/workspace/facility/facility-a/data/meters/meter-b/settings'
    ));

    expect(service.selectedMeterGuid()).toBe('meter-b');
    expect(service.selectedMeter()?.name).toBe('Water Main');
    expect(service.selectedMeterCard()?.meter.guid).toBe('meter-b');
    expect(service.selectedMeterReadingCount()).toBe(0);

    events.next(new NavigationEnd(
      2,
      '/v1/workspace/facility/facility-a/data/meters/meter-missing/settings',
      '/v1/workspace/facility/facility-a/data/meters/meter-missing/settings'
    ));

    expect(service.selectedMeterGuid()).toBe('meter-missing');
    expect(service.selectedMeter()).toBeUndefined();
    expect(service.selectedMeterCard()).toBeUndefined();
  });

  it('does not calendarize meters on the grouping organizer route', () => {
    const events = new Subject<unknown>();

    TestBed.configureTestingModule({
      providers: [
        FacilityMetersWorkspaceService,
        {
          provide: Router,
          useValue: {
            url: '/v1/workspace/facility/facility-a/data/meter-grouping',
            events
          }
        },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account: signal({ guid: 'account-a', name: 'Account A' }),
            selectedFacility: signal({ guid: 'facility-a', name: 'Facility A' }),
            canWrite: signal(true),
            hasPending: signal(false),
            facilityMeters: signal([meter({ guid: 'meter-a' })]),
            facilityMeterData: signal([reading({ guid: 'reading-a', meterId: 'meter-a' })]),
            facilityMeterGroups: signal([group({ guid: 'group-a' })])
          }
        },
        {
          provide: AccountStatusCheckService,
          useValue: {
            selectedFacilityStatusCheck$: of({ metersStatusChecks: [] })
          }
        }
      ]
    });

    const service = TestBed.inject(FacilityMetersWorkspaceService);

    expect(service.calendarizationState()).toBe('idle');
    expect(service.calendarizedMeters()).toEqual([]);
  });

  it('does not restart calendarization when switching meter group workbench tabs', async () => {
    useFakeWorker();
    const events = new Subject<unknown>();
    const service = setupService({
      url: '/v1/workspace/facility/facility-a/data/meter-grouping/group-a/monthly-table',
      events,
      meterData: [reading({ guid: 'reading-a', meterId: 'meter-a' })]
    });
    await settleSignals();
    const calendarizedMeter = { meter: meter({ guid: 'meter-a', groupId: 'group-a' }), monthlyData: [] } as unknown as CalanderizedMeter;

    expect(FakeWorker.instances).toHaveLength(1);
    FakeWorker.instances[0].emitMessage({ calanderizedMeters: [calendarizedMeter] });
    expect(service.calendarizationState()).toBe('ready');

    events.next(new NavigationEnd(
      1,
      '/v1/workspace/facility/facility-a/data/meter-grouping/group-a/monthly-table',
      '/v1/workspace/facility/facility-a/data/meter-grouping/group-a/yearly-graph'
    ));
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(1);
    expect(service.calendarizationState()).toBe('ready');
    expect(service.calendarizedMeters()).toEqual([calendarizedMeter]);
  });

  it('starts calendarization when navigating from grouping organizer into a group workbench', async () => {
    useFakeWorker();
    const events = new Subject<unknown>();
    const service = setupService({
      url: '/v1/workspace/facility/facility-a/data/meter-grouping',
      events,
      meterData: [reading({ guid: 'reading-a', meterId: 'meter-a' })]
    });
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(0);
    expect(service.calendarizationState()).toBe('idle');

    events.next(new NavigationEnd(
      1,
      '/v1/workspace/facility/facility-a/data/meter-grouping',
      '/v1/workspace/facility/facility-a/data/meter-grouping/group-a/monthly-table'
    ));
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(1);
    expect(service.calendarizationState()).toBe('loading');
  });

  it('sets calendarized meter results from the worker response without sharing reading objects in the payload', async () => {
    useFakeWorker();
    const meterReading = reading({ guid: 'reading-a', meterId: 'meter-a' });
    const service = setupService({
      url: '/v1/workspace/facility/facility-a/data/meters',
      meterData: [meterReading]
    });
    await settleSignals();
    const worker = FakeWorker.instances[0];
    const payload = worker.payload as { allMeterData: ReturnType<typeof reading>[] };
    const calendarizedMeter = { meter: meter({ guid: 'meter-a' }), monthlyData: [] } as unknown as CalanderizedMeter;

    expect(service.calendarizationState()).toBe('loading');
    expect(payload.allMeterData[0]).toEqual(meterReading);
    expect(payload.allMeterData[0]).not.toBe(meterReading);

    worker.emitMessage({ calanderizedMeters: [calendarizedMeter] });

    expect(service.calendarizationState()).toBe('ready');
    expect(service.calendarizedMeters()).toEqual([calendarizedMeter]);
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('sets an error state from worker error responses', async () => {
    useFakeWorker();
    const service = setupService({
      url: '/v1/workspace/facility/facility-a/data/meters',
      meterData: [reading({ guid: 'reading-a', meterId: 'meter-a' })]
    });
    await settleSignals();

    FakeWorker.instances[0].emitMessage({ error: true });

    expect(service.calendarizationState()).toBe('error');
    expect(service.calendarizedMeters()).toEqual([]);
  });

  it('cancels stale worker requests when meter data changes', async () => {
    useFakeWorker();
    const meterData = signal([
      reading({ guid: 'reading-a', meterId: 'meter-a', totalEnergyUse: 10 })
    ]);
    const service = setupService({
      url: '/v1/workspace/facility/facility-a/data/meters',
      meterData
    });
    await settleSignals();
    const firstWorker = FakeWorker.instances[0];
    const staleCalendarizedMeter = { meter: meter({ guid: 'meter-a' }), monthlyData: [] } as unknown as CalanderizedMeter;
    const currentCalendarizedMeter = { meter: meter({ guid: 'meter-a' }), monthlyData: [{ energyUse: 20 }] } as unknown as CalanderizedMeter;

    meterData.set([
      reading({ guid: 'reading-b', meterId: 'meter-a', totalEnergyUse: 20 })
    ]);
    await settleSignals();

    const secondWorker = FakeWorker.instances[1];
    expect(firstWorker.terminate).toHaveBeenCalled();

    firstWorker.emitMessage({ calanderizedMeters: [staleCalendarizedMeter] });
    expect(service.calendarizationState()).toBe('loading');
    expect(service.calendarizedMeters()).toEqual([]);

    secondWorker.emitMessage({ calanderizedMeters: [currentCalendarizedMeter] });
    expect(service.calendarizationState()).toBe('ready');
    expect(service.calendarizedMeters()).toEqual([currentCalendarizedMeter]);
  });
});

function setupService(options: {
  url: string;
  events?: Subject<unknown>;
  meterData?: WritableSignal<ReturnType<typeof reading>[]> | ReturnType<typeof reading>[];
}): FacilityMetersWorkspaceService {
  const meterData = Array.isArray(options.meterData)
    ? signal(options.meterData)
    : options.meterData ?? signal([]);
  const events = options.events ?? new Subject<unknown>();
  TestBed.configureTestingModule({
    providers: [
      FacilityMetersWorkspaceService,
      {
        provide: Router,
        useValue: {
          url: options.url,
          events
        }
      },
      {
        provide: AccountWorkspaceStore,
        useValue: {
          account: signal({ guid: 'account-a', name: 'Account A', assessmentReportVersion: '0.0.0' }),
          selectedFacility: signal({ guid: 'facility-a', name: 'Facility A' }),
          canWrite: signal(true),
          hasPending: signal(false),
          facilityMeters: signal([meter({ guid: 'meter-a' })]),
          facilityMeterData: meterData,
          facilityMeterGroups: signal([group({ guid: 'group-a' })])
        }
      },
      {
        provide: AccountStatusCheckService,
        useValue: {
          selectedFacilityStatusCheck$: of({ metersStatusChecks: [] })
        }
      }
    ]
  });
  return TestBed.inject(FacilityMetersWorkspaceService);
}

function useFakeWorker(): void {
  (globalThis as unknown as { Worker: typeof Worker }).Worker = FakeWorker as unknown as typeof Worker;
}

async function settleSignals(): Promise<void> {
  TestBed.flushEffects();
  await Promise.resolve();
  TestBed.flushEffects();
  await Promise.resolve();
}

class FakeWorker {
  static instances: FakeWorker[] = [];
  readonly listeners = new Map<string, Array<(event: MessageEvent | ErrorEvent) => void>>();
  readonly terminate = vi.fn();
  payload: unknown = undefined;

  constructor() {
    FakeWorker.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent | ErrorEvent) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  postMessage(payload: unknown): void {
    this.payload = payload;
  }

  emitMessage(data: unknown): void {
    this.emit('message', { data } as MessageEvent);
  }

  private emit(type: string, event: MessageEvent | ErrorEvent): void {
    if (this.terminate.mock.calls.length > 0) {
      return;
    }
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

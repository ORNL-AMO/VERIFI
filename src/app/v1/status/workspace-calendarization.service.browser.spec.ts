import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CalanderizedMeter } from '@data/models/calanderization';
import { account, facility, meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { WorkspaceCalendarizationService } from './workspace-calendarization.service';

describe('WorkspaceCalendarizationService browser contract', () => {
  let originalWorker: typeof Worker;

  beforeEach(() => {
    originalWorker = globalThis.Worker;
    FakeWorker.instances = [];
    globalThis.Worker = FakeWorker as unknown as typeof Worker;
  });

  afterEach(() => {
    globalThis.Worker = originalWorker;
    TestBed.resetTestingModule();
  });

  it('publishes only the current account revision and terminates superseded workers', async () => {
    const currentSnapshot = signal(workspaceSnapshot('account-a', 10));
    const revision = signal(1);
    const ready = signal(true);
    const service = setup(currentSnapshot, revision, ready);
    await settleSignals();
    const firstWorker = FakeWorker.instances[0];

    currentSnapshot.set(workspaceSnapshot('account-a', 20));
    revision.set(2);
    await settleSignals();
    const secondWorker = FakeWorker.instances[1];
    expect(firstWorker.terminate).toHaveBeenCalled();

    firstWorker.emitMessage({ calanderizedMeters: [calendarizedResult(10)] });
    expect(service.state()).toBe('evaluating');
    expect(service.calendarizedMeters()).toEqual([]);

    secondWorker.emitMessage({ calanderizedMeters: [calendarizedResult(20)] });
    expect(service.state()).toBe('ready');
    expect(service.revision()).toBe(2);
    expect(service.calendarizedMeters()[0].monthlyData[0].energyUse).toBe(20);
  });

  it('includes the full account calculation context and clones meter readings', async () => {
    const snapshot = workspaceSnapshot('account-a', 10, {
      customEmissions: [{ guid: 'emission-a' }] as any,
      customFuels: [{ guid: 'fuel-a' }] as any,
      customGWPs: [{ guid: 'gwp-a' }] as any
    });
    const service = setup(signal(snapshot), signal(4), signal(true));
    await settleSignals();
    const payload = FakeWorker.instances[0].payload as any;

    expect(service.state()).toBe('evaluating');
    expect(payload.co2Emissions).toEqual(snapshot.customEmissions);
    expect(payload.customFuels).toEqual(snapshot.customFuels);
    expect(payload.customGWPs).toEqual(snapshot.customGWPs);
    expect(payload.allMeterData[0]).toEqual(snapshot.meterData[0]);
    expect(payload.allMeterData[0]).not.toBe(snapshot.meterData[0]);
  });
});

function setup(snapshot: WritableSignal<AccountWorkspaceSnapshot>, revision: WritableSignal<number>, ready: WritableSignal<boolean>): WorkspaceCalendarizationService {
  TestBed.configureTestingModule({
    providers: [
      WorkspaceCalendarizationService,
      {
        provide: AccountWorkspaceStore,
        useValue: {
          snapshot,
          revision,
          isReady: ready,
          account: () => snapshot().account
        }
      }
    ]
  });
  return TestBed.inject(WorkspaceCalendarizationService);
}

function workspaceSnapshot(accountGuid: string, energyUse: number, overrides: Partial<AccountWorkspaceSnapshot> = {}): AccountWorkspaceSnapshot {
  const meterValue = meter({ accountId: accountGuid, meterReadingDataApplication: 'fullMonth' });
  return {
    account: account({ guid: accountGuid, assessmentReportVersion: 'AR6' }),
    facilities: [facility({ accountId: accountGuid })],
    meters: [meterValue],
    meterData: [reading({ accountId: accountGuid, totalEnergyUse: energyUse })],
    meterGroups: [], predictors: [], predictorData: [], facilityAnalyses: [], accountAnalyses: [],
    accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [],
    energyUseGroups: [], energyUseEquipment: [], ...overrides
  };
}

function calendarizedResult(energyUse: number): CalanderizedMeter {
  return {
    meter: meter({}), monthlyData: [{ energyUse }], consumptionUnit: 'kWh', showConsumption: true,
    showEnergyUse: true, showElectricalEmissions: false, showOtherScope2Emissions: false,
    showStationaryEmissions: false, showFugitiveEmissions: false, showProcessEmissions: false,
    showMobileEmissions: false, energyUnit: 'kWh', energyIsSource: false
  } as CalanderizedMeter;
}

async function settleSignals(): Promise<void> {
  TestBed.flushEffects();
  await Promise.resolve();
  TestBed.flushEffects();
}

class FakeWorker {
  static instances: FakeWorker[] = [];
  readonly listeners = new Map<string, Array<(event: MessageEvent | ErrorEvent) => void>>();
  readonly terminate = vi.fn();
  payload: unknown;

  constructor() { FakeWorker.instances.push(this); }
  addEventListener(type: string, listener: (event: MessageEvent | ErrorEvent) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  postMessage(payload: unknown): void { this.payload = payload; }
  emitMessage(data: unknown): void {
    if (this.terminate.mock.calls.length > 0) return;
    for (const listener of this.listeners.get('message') ?? []) listener({ data } as MessageEvent);
  }
}

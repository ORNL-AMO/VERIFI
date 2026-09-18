import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CalanderizedMeter } from '@data/models/calanderization';
import { account, facility, meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { Subscription } from 'rxjs';
import { WorkspaceCalendarizationBaseResult } from './workspace-calendarization.models';
import { WorkspaceCalendarizationService } from './workspace-calendarization.service';

describe('WorkspaceCalendarizationService browser contract', () => {
  let originalWorker: typeof Worker;
  let subscriptions: Subscription[];

  beforeEach(() => {
    originalWorker = globalThis.Worker;
    subscriptions = [];
    FakeWorker.instances = [];
    globalThis.Worker = FakeWorker as unknown as typeof Worker;
  });

  afterEach(() => {
    subscriptions.forEach(subscription => subscription.unsubscribe());
    globalThis.Worker = originalWorker;
    TestBed.resetTestingModule();
  });

  it('shares one worker and does not recalculate for display-only changes', async () => {
    const snapshot = signal(workspaceSnapshot('account-a', 10));
    const service = setup(snapshot, signal(true));
    subscriptions.push(service.calendarizeBase().subscribe());
    subscriptions.push(service.calendarizeBase().subscribe());
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(1);
    const displayOnly = workspaceSnapshot('account-a', 10);
    displayOnly.facilities[0] = { ...displayOnly.facilities[0], energyUnit: 'GJ', energyIsSource: true };
    displayOnly.meters[0] = { ...displayOnly.meters[0], displayEnergyUnit: 'kWh', displayEnergyIsSource: true };
    snapshot.set(displayOnly);
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(1);
  });

  it('terminates obsolete work and rejects stale publication after calculation inputs or accounts change', async () => {
    const snapshot = signal(workspaceSnapshot('account-a', 10));
    const service = setup(snapshot, signal(true));
    let latest: WorkspaceCalendarizationBaseResult | undefined;
    subscriptions.push(service.calendarizeBase().subscribe(result => latest = result));
    await settleSignals();
    const first = FakeWorker.instances[0];

    snapshot.set(workspaceSnapshot('account-a', 20));
    await settleSignals();
    const second = FakeWorker.instances[1];
    expect(first.terminate).toHaveBeenCalled();

    first.emitMessage({ calanderizedMeters: [calendarizedResult('account-a', 10)] });
    expect(latest?.state).toBe('evaluating');
    second.emitMessage({ calanderizedMeters: [calendarizedResult('account-a', 20)] });
    expect(latest?.state).toBe('ready');
    expect(latest?.meters[0].monthlyData[0].energyUse).toBe(20);

    snapshot.set(workspaceSnapshot('account-b', 30));
    await settleSignals();
    expect(second.terminate).toHaveBeenCalled();
    FakeWorker.instances[2].emitMessage({ calanderizedMeters: [calendarizedResult('account-b', 30)] });
    expect(latest?.accountGuid).toBe('account-b');
  });
});

function setup(snapshot: WritableSignal<AccountWorkspaceSnapshot>, ready: WritableSignal<boolean>): WorkspaceCalendarizationService {
  TestBed.configureTestingModule({ providers: [WorkspaceCalendarizationService, {
    provide: AccountWorkspaceStore, useValue: { snapshot, isReady: ready }
  }] });
  return TestBed.inject(WorkspaceCalendarizationService);
}

function workspaceSnapshot(accountGuid: string, energyUse: number): AccountWorkspaceSnapshot {
  const accountValue = account({ guid: accountGuid, assessmentReportVersion: 'AR6' });
  const facilityValue = facility({ guid: 'facility-a', accountId: accountGuid, energyUnit: 'kWh', energyIsSource: false });
  const meterValue = meter({ guid: 'meter-a', accountId: accountGuid, facilityId: 'facility-a', meterReadingDataApplication: 'fullMonth' });
  return {
    account: accountValue, facilities: [facilityValue], meters: [meterValue],
    meterData: [reading({ accountId: accountGuid, facilityId: 'facility-a', meterId: 'meter-a', totalEnergyUse: energyUse })],
    meterGroups: [], predictors: [], predictorData: [], facilityAnalyses: [], accountAnalyses: [], accountReports: [],
    facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  };
}

function calendarizedResult(accountGuid: string, energyUse: number): CalanderizedMeter {
  return {
    meter: meter({ guid: 'meter-a', accountId: accountGuid, facilityId: 'facility-a' }),
    monthlyData: [{ energyUse }], consumptionUnit: 'MMBtu', showConsumption: false, showEnergyUse: true,
    showElectricalEmissions: false, showOtherScope2Emissions: false, showStationaryEmissions: false,
    showFugitiveEmissions: false, showProcessEmissions: false, showMobileEmissions: false,
    energyUnit: 'MMBtu', energyIsSource: false
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

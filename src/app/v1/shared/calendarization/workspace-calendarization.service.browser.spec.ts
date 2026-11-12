import { SubregionEmissions } from '@data/models/eGridEmissions';
import { getNewAccountEmissionsItem } from '@data/models/idbModels/customEmissions';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CalanderizedMeter } from '@data/models/calanderization';
import { account, facility, meter, reading } from '@app/v1/data/meters/facility-meters.testing';
import { Subscription } from 'rxjs';
import { WorkspaceCalendarizationBaseResult } from './workspace-calendarization.models';
import { WorkspaceCalendarizationService } from './workspace-calendarization.service';
import { WorkspaceCalendarizationWorkerPayload } from './workspace-calendarization-request';

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
    const original = workspaceSnapshot('account-a', 10);
    const displayOnly: AccountWorkspaceSnapshot = {
      ...original,
      facilities: [{ ...original.facilities[0], energyUnit: 'GJ', energyIsSource: true }],
      meters: [{ ...original.meters[0], displayEnergyUnit: 'kWh', displayEnergyIsSource: true }]
    };
    snapshot.set(displayOnly);
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(1);
  });

  it('starts no inactive Worker for catalog loading, then replaces only active work when rate inputs change', async () => {
    const original = workspaceSnapshot('account-a', 10);
    const custom = { ...getNewAccountEmissionsItem('account-a'), subregion: 'CUSTOM-A' };
    const snapshot = signal({ ...original, customEmissions: [custom] });
    const builtin = signal<readonly SubregionEmissions[] | undefined>(undefined);
    const service = setup(snapshot, signal(true), builtin);
    const rates: SubregionEmissions[] = [{ subregion: 'BUILTIN', locationEmissionRates: [{ year: 2025, CO2: 10, CH4: 0, N2O: 0 }], residualEmissionRates: [] }];
    const ratesBefore = structuredClone(rates), customBefore = structuredClone(custom);
    builtin.set(rates); await settleSignals();
    expect(FakeWorker.instances).toHaveLength(0);
    expect(service.currentEmissionsRates()).toEqual([...rates, custom]);
    const subscription = service.calendarizeBase().subscribe(); subscriptions.push(subscription); await settleSignals();
    expect(FakeWorker.instances).toHaveLength(1);
    const payload = FakeWorker.instances[0].payload as WorkspaceCalendarizationWorkerPayload;
    expect(payload.co2Emissions).toEqual([...rates, custom]);
    const fingerprint = service.currentInputFingerprint();
    builtin.set(structuredClone(rates)); await settleSignals();
    expect(FakeWorker.instances).toHaveLength(1); expect(service.currentInputFingerprint()).toBe(fingerprint);
    const changed = structuredClone(rates); changed[0].locationEmissionRates[0].CO2 = 11;
    builtin.set(changed); await settleSignals();
    expect(FakeWorker.instances).toHaveLength(2); expect(FakeWorker.instances[0].terminate).toHaveBeenCalled();
    expect(service.currentInputFingerprint()).not.toBe(fingerprint);
    subscription.unsubscribe();
    builtin.set(rates); await settleSignals(); expect(FakeWorker.instances).toHaveLength(2);
    expect(rates).toEqual(ratesBefore); expect(custom).toEqual(customBefore);
  });

  it('switches custom rate inputs with the account snapshot without leaking legacy account rates', async () => {
    const customA = { ...getNewAccountEmissionsItem('account-a'), subregion: 'CUSTOM-A' };
    const customB = { ...getNewAccountEmissionsItem('account-b'), subregion: 'CUSTOM-B' };
    const snapshot = signal({ ...workspaceSnapshot('account-a', 10), customEmissions: [customA] });
    const builtin = signal<readonly SubregionEmissions[] | undefined>([{ subregion: 'BUILTIN', locationEmissionRates: [], residualEmissionRates: [] }]);
    const service = setup(snapshot, signal(true), builtin);
    subscriptions.push(service.calendarizeBase().subscribe()); await settleSignals();
    expect((FakeWorker.instances[0].payload as WorkspaceCalendarizationWorkerPayload).co2Emissions.map(item => item.subregion)).toEqual(['BUILTIN', 'CUSTOM-A']);
    snapshot.set({ ...workspaceSnapshot('account-b', 20), customEmissions: [customB] }); await settleSignals();
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalled();
    expect((FakeWorker.instances[1].payload as WorkspaceCalendarizationWorkerPayload).co2Emissions.map(item => item.subregion)).toEqual(['BUILTIN', 'CUSTOM-B']);
    expect(service.currentEmissionsRates().map(item => item.subregion)).toEqual(['BUILTIN', 'CUSTOM-B']);
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

  it('retries a failed shared calculation once for the current snapshot and publishes to all subscribers', async () => {
    const snapshot = signal(workspaceSnapshot('account-a', 10));
    const service = setup(snapshot, signal(true));
    let first: WorkspaceCalendarizationBaseResult | undefined;
    let second: WorkspaceCalendarizationBaseResult | undefined;
    subscriptions.push(service.calendarizeBase().subscribe(result => first = result));
    subscriptions.push(service.calendarizeBase().subscribe(result => second = result));
    await settleSignals();
    FakeWorker.instances[0].emitMessage({ error: true });
    expect(first?.state).toBe('error');
    service.retry();
    await settleSignals();
    expect(FakeWorker.instances).toHaveLength(2);
    expect(first?.state).toBe('evaluating');
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalled();
    FakeWorker.instances[1].emitMessage({ calanderizedMeters: [calendarizedResult('account-a', 10)] });
    expect(first?.state).toBe('ready');
    expect(second).toBe(first);
    expect(snapshot().meterData[0].totalEnergyUse).toBe(10);
  });
});

function setup(snapshot: WritableSignal<AccountWorkspaceSnapshot>, ready: WritableSignal<boolean>,
  builtin: WritableSignal<readonly SubregionEmissions[] | undefined> = signal(undefined)): WorkspaceCalendarizationService {
  TestBed.configureTestingModule({ providers: [WorkspaceCalendarizationService,
    { provide: EGridService, useValue: { builtinEmissions: builtin,
      co2Emissions: [{ subregion: 'STALE-LEGACY-ACCOUNT', locationEmissionRates: [], residualEmissionRates: [] }] } }, {
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
    facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: [], savedVisualizations: []
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

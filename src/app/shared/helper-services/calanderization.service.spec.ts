import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CALCULATION_WORKER_TIMEOUT_MS } from '@platform/web-workers/run-worker';
import { CalanderizationService } from './calanderization.service';
import { AccountStatusCheckService } from './account-status-check.service';

type Listener = (event: MessageEvent | ErrorEvent) => void;

class FakeWorker {
  static instances: Array<FakeWorker> = [];
  readonly listeners = new Map<string, Set<Listener>>();
  readonly terminate = vi.fn();
  readonly postMessage = vi.fn();

  constructor() {
    FakeWorker.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchMessage(data: unknown): void {
    this.listeners.get('message')?.forEach(listener => listener(new MessageEvent('message', { data })));
  }

  dispatchError(): void {
    this.listeners.get('error')?.forEach(listener => listener(new ErrorEvent('error', { message: 'failed' })));
  }
}

describe('CalanderizationService', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    TestBed.configureTestingModule({ providers: [AccountWorkspaceStore, CalanderizationService, AccountStatusCheckService] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('cancels an old account job and ignores its late response', () => {
    const store = TestBed.inject(AccountWorkspaceStore);
    const service = TestBed.inject(CalanderizationService);
    store.publish(createSnapshot('account-a'));
    TestBed.flushEffects();
    const firstWorker = FakeWorker.instances[0];

    store.beginLoad(true);
    TestBed.flushEffects();
    expect(firstWorker.terminate).toHaveBeenCalledOnce();
    expect(service.calendarizationState.value.status).toBe('loading');

    store.publish(createSnapshot('account-b'));
    TestBed.flushEffects();
    const secondWorker = FakeWorker.instances[1];

    firstWorker.dispatchMessage({ error: false, calanderizedMeters: [{ stale: true }] });
    expect(service.calendarizationState.value.status).toBe('loading');

    secondWorker.dispatchMessage({ error: false, calanderizedMeters: [] });
    const state = service.calendarizationState.value;
    expect(state.status).toBe('ready');
    if (state.status === 'ready') {
      expect(state.accountGuid).toBe('account-b');
      expect(state.workspaceSnapshot).toBe(store.snapshot());
    }
  });

  it('reuses ready meter data across analysis-only commits and rebinds the revision', () => {
    const store = TestBed.inject(AccountWorkspaceStore);
    const service = TestBed.inject(CalanderizationService);
    store.publish(createSnapshot('account-a'));
    TestBed.flushEffects();
    const meters = [];
    FakeWorker.instances[0].dispatchMessage({ error: false, calanderizedMeters: meters });
    store.publishCommittedPatch({ collections: [{ collection: 'facilityAnalyses', upsert: [{ guid: 'analysis-a', accountId: 'account-a' }] }] });
    TestBed.flushEffects();
    expect(FakeWorker.instances).toHaveLength(1);
    expect(service.calanderizedMeters.value).toBe(meters);
    expect(service.calendarizationState.value).toMatchObject({ status: 'ready', workspaceRevision: 1 });
    expect(service.isReadyForCurrentWorkspace()).toBe(true);
    if (service.calendarizationState.value.status === 'ready') {
      expect(service.calendarizationState.value.workspaceSnapshot).toBe(store.snapshot());
    }
  });

  it('refreshes validation for the current analysis snapshot without a transient missing status', () => {
    const store = TestBed.inject(AccountWorkspaceStore);
    const calendarization = TestBed.inject(CalanderizationService);
    const checks = TestBed.inject(AccountStatusCheckService);
    store.publish(createSnapshot('account-a'));
    TestBed.flushEffects();
    FakeWorker.instances[0].dispatchMessage({ error: false, calanderizedMeters: [] });
    const previous = checks.accountStatusCheck.value;
    expect(previous).toBeDefined();
    const published: unknown[] = [];
    const subscription = checks.accountStatusCheck.subscribe(value => published.push(value));
    published.length = 0;
    store.publishCommittedPatch({ collections: [{ collection: 'facilityAnalyses', upsert: [{ guid: 'analysis-a', accountId: 'account-a' }] }] });
    TestBed.flushEffects();
    expect(checks.accountStatusCheck.value).toBeDefined();
    expect(checks.accountStatusCheck.value).not.toBe(previous);
    expect(published).not.toContain(undefined);
    expect(calendarization.isReadyForCurrentWorkspace()).toBe(true);
    subscription.unsubscribe();
  });

  it('keeps an in-flight request across unrelated commits and publishes for the latest snapshot', () => {
    const store = TestBed.inject(AccountWorkspaceStore);
    const service = TestBed.inject(CalanderizationService);
    store.publish(createSnapshot('account-a'));
    TestBed.flushEffects();
    const worker = FakeWorker.instances[0];
    store.publishCommittedPatch({ collections: [{ collection: 'accountAnalyses', upsert: [{ guid: 'analysis-a', accountId: 'account-a' }] }] });
    TestBed.flushEffects();
    expect(worker.terminate).not.toHaveBeenCalled();
    expect(FakeWorker.instances).toHaveLength(1);
    worker.dispatchMessage({ error: false, calanderizedMeters: [] });
    expect(service.calendarizationState.value).toMatchObject({ status: 'ready', workspaceRevision: 1 });
    expect(service.isReadyForCurrentWorkspace()).toBe(true);
  });

  it('invalidates ready data for changed settings or readings, including before effects run', () => {
    const store = TestBed.inject(AccountWorkspaceStore);
    const service = TestBed.inject(CalanderizationService);
    store.publish(createSnapshot('account-a'));
    TestBed.flushEffects();
    FakeWorker.instances[0].dispatchMessage({ error: false, calanderizedMeters: [] });
    store.publishCommittedPatch({ account: { ...store.account(), energyUnit: 'kWh' } as any });
    expect(service.isReadyForCurrentWorkspace()).toBe(false);
    TestBed.flushEffects();
    expect(FakeWorker.instances).toHaveLength(2);
    FakeWorker.instances[1].dispatchMessage({ error: false, calanderizedMeters: [] });
    store.publishCommittedPatch({ collections: [{ collection: 'meterData', upsert: [{ guid: 'reading-a', accountId: 'account-a', totalEnergyUse: 42 } as any] }] });
    expect(service.isReadyForCurrentWorkspace()).toBe(false);
    TestBed.flushEffects();
    expect(FakeWorker.instances).toHaveLength(3);
    expect(service.calendarizationState.value.status).toBe('loading');
  });

  it('exposes a recoverable error when constructing a worker fails', () => {
    vi.stubGlobal('Worker', class { constructor() { throw new Error('worker unavailable'); } });
    const store = TestBed.inject(AccountWorkspaceStore);
    const service = TestBed.inject(CalanderizationService);
    store.publish(createSnapshot('account-a'));
    TestBed.flushEffects();
    expect(service.calendarizationState.value.status).toBe('error');
    vi.stubGlobal('Worker', FakeWorker);
    service.recalculateCurrentWorkspace();
    expect(FakeWorker.instances).toHaveLength(1);
    FakeWorker.instances[0].dispatchMessage({ error: false, calanderizedMeters: [] });
    expect(service.calendarizationState.value.status).toBe('ready');
  });

  it('restarts a finished rejected request when inputs revert before the workspace observable flushes', () => {
    const store = TestBed.inject(AccountWorkspaceStore);
    const service = TestBed.inject(CalanderizationService);
    store.publish(createSnapshot('account-a'));
    TestBed.flushEffects();
    const originalAccount = store.account();
    const worker = FakeWorker.instances[0];
    store.publishCommittedPatch({ account: { ...originalAccount, energyUnit: 'kWh' } as any });
    worker.dispatchMessage({ error: false, calanderizedMeters: [] });
    expect(worker.terminate).toHaveBeenCalledOnce();
    store.publishCommittedPatch({ account: { ...originalAccount } as any });
    TestBed.flushEffects();
    expect(FakeWorker.instances).toHaveLength(2);
    FakeWorker.instances[1].dispatchMessage({ error: false, calanderizedMeters: [] });
    expect(service.calendarizationState.value.status).toBe('ready');
  });

  it('publishes an error on native worker failure and starts a fresh retry', () => {
    const store = TestBed.inject(AccountWorkspaceStore);
    const service = TestBed.inject(CalanderizationService);
    store.publish(createSnapshot('account-a'));
    TestBed.flushEffects();

    FakeWorker.instances[0].dispatchError();
    expect(service.calendarizationState.value.status).toBe('error');

    service.recalculateCurrentWorkspace();
    expect(FakeWorker.instances).toHaveLength(2);
    expect(service.calendarizationState.value.status).toBe('loading');
  });

  it('terminates and exposes retry after the two-minute timeout', () => {
    vi.useFakeTimers();
    const store = TestBed.inject(AccountWorkspaceStore);
    const service = TestBed.inject(CalanderizationService);
    store.publish(createSnapshot('account-a'));
    TestBed.flushEffects();
    const worker = FakeWorker.instances[0];

    vi.advanceTimersByTime(CALCULATION_WORKER_TIMEOUT_MS);

    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(service.calendarizationState.value.status).toBe('error');
  });

  it('only exposes facility meters from a ready result matching the current workspace', () => {
    const store = TestBed.inject(AccountWorkspaceStore);
    const service = TestBed.inject(CalanderizationService);
    store.publish(createSnapshot('account-a'));
    TestBed.flushEffects();

    expect(service.getReadyCalanderizedMetersByFacilityID('facility-a')).toBeUndefined();

    const result = {
      meter: { guid: 'meter-a', facilityId: 'facility-a' }
    } as any;
    FakeWorker.instances[0].dispatchMessage({ error: false, calanderizedMeters: [result] });

    expect(service.getReadyCalanderizedMetersByFacilityID('facility-a')).toEqual([result]);

    store.beginLoad(true);
    TestBed.flushEffects();
    expect(service.getReadyCalanderizedMetersByFacilityID('facility-a')).toBeUndefined();
  });
});

function createSnapshot(accountGuid: string): AccountWorkspaceSnapshot {
  return {
    account: { guid: accountGuid, name: 'Test Account', assessmentReportVersion: 'v0' } as any,
    facilities: [],
    meters: [],
    meterData: [],
    meterGroups: [],
    predictors: [],
    predictorData: [],
    facilityAnalyses: [],
    accountAnalyses: [],
    accountReports: [],
    facilityReports: [],
    customEmissions: [],
    customFuels: [],
    customGWPs: [],
    energyUseGroups: [],
    savedVisualizations: [], energyUseEquipment: []
  };
}

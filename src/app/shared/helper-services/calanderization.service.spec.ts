import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CALCULATION_WORKER_TIMEOUT_MS } from '@platform/web-workers/run-worker';
import { CalanderizationService } from './calanderization.service';

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
    TestBed.configureTestingModule({ providers: [AccountWorkspaceStore, CalanderizationService] });
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
    energyUseEquipment: []
  };
}

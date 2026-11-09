import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CALCULATION_WORKER_TIMEOUT_MS } from '@platform/web-workers/run-worker';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { AccountHomeComponent } from './account-home.component';
import { AccountHomeService } from './account-home.service';

@NgModule({
  declarations: [AccountHomeComponent],
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
class AccountHomeWorkerTestModule {}

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

  get payload(): any {
    return this.postMessage.mock.calls[0]?.[0];
  }
}

describe('AccountHomeComponent worker lifecycle', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    TestBed.configureTestingModule({
      imports: [AccountHomeWorkerTestModule],
      providers: [
        AccountWorkspaceStore,
        AccountHomeService,
        { provide: EGridService, useValue: { co2Emissions: [] } }
      ]
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('cancels old-account jobs and publishes only the replacement account results', () => {
    const store = TestBed.inject(AccountWorkspaceStore);
    const homeService = TestBed.inject(AccountHomeService);
    store.publish(createSnapshot('account-a'));
    const component = TestBed.runInInjectionContext(() => new AccountHomeComponent());
    TestBed.flushEffects();
    const oldWorkers = [...FakeWorker.instances];

    store.beginLoad(true);
    TestBed.flushEffects();
    expect(oldWorkers.every(worker => worker.terminate.mock.calls.length === 1)).toBe(true);
    expect(homeService.calculatingEnergy.value).toBe(true);
    expect(homeService.calculatingOverview.value).toBe(true);

    store.publish(createSnapshot('account-b'));
    TestBed.flushEffects();
    const newWorkers = FakeWorker.instances.slice(oldWorkers.length);

    oldWorkers.forEach(worker => respondSuccessfully(worker, 'old'));
    expect(homeService.accountOverviewData.value).toBeUndefined();

    newWorkers.forEach(worker => respondSuccessfully(worker, 'new'));
    expect((homeService.accountOverviewData.value as any).marker).toBe('new');
    expect(homeService.calculatingEnergy.value).toBe(false);
    expect(homeService.calculatingOverview.value).toBe(false);
    component.ngOnDestroy();
  });

  it('ends failed jobs, retries from the current snapshot, and terminates active jobs on destroy', () => {
    const store = TestBed.inject(AccountWorkspaceStore);
    const homeService = TestBed.inject(AccountHomeService);
    store.publish(createSnapshot('account-a'));
    const component = TestBed.runInInjectionContext(() => new AccountHomeComponent());
    TestBed.flushEffects();
    const energyWorker = FakeWorker.instances.find(worker => worker.payload.accountAnalysisItem);
    const overviewWorker = FakeWorker.instances.find(worker => worker.payload.type === 'overview');
    overviewWorker.dispatchMessage({ error: false, accountOverviewData: { marker: 'overview' } });
    energyWorker.dispatchError();

    expect(homeService.calculatingEnergy.value).toBe('error');
    component.retryEnergyCard();
    const retryWorkers = FakeWorker.instances.slice(2);
    expect(retryWorkers).toHaveLength(2);
    expect(retryWorkers.every(worker => worker.payload.requestContext.accountGuid === 'account-a')).toBe(true);
    expect(homeService.calculatingEnergy.value).toBe(true);
    expect(homeService.calculatingOverview.value).toBe(true);

    component.ngOnDestroy();
    expect(retryWorkers.every(worker => worker.terminate.mock.calls.length === 1)).toBe(true);
    expect(homeService.calculatingEnergy.value).toBe(false);
    expect(homeService.calculatingOverview.value).toBe(false);
  });

  it('moves all active homepage jobs to error after two minutes', () => {
    vi.useFakeTimers();
    const store = TestBed.inject(AccountWorkspaceStore);
    const homeService = TestBed.inject(AccountHomeService);
    store.publish(createSnapshot('account-a'));
    const component = TestBed.runInInjectionContext(() => new AccountHomeComponent());
    TestBed.flushEffects();

    vi.advanceTimersByTime(CALCULATION_WORKER_TIMEOUT_MS);

    expect(homeService.calculatingEnergy.value).toBe('error');
    expect(homeService.calculatingOverview.value).toBe('error');
    expect(FakeWorker.instances.every(worker => worker.terminate.mock.calls.length === 1)).toBe(true);
    component.ngOnDestroy();
  });
});

function respondSuccessfully(worker: FakeWorker, marker: string): void {
  if (worker.payload.type === 'overview') {
    worker.dispatchMessage({ error: false, accountOverviewData: { marker } });
  } else {
    worker.dispatchMessage({ error: false, annualAnalysisSummaries: [], monthlyAnalysisSummaryData: [] });
  }
}

function createSnapshot(accountGuid: string): AccountWorkspaceSnapshot {
  return {
    account: {
      guid: accountGuid,
      name: 'Account',
      selectedEnergyAnalysisId: `analysis-${accountGuid}`,
      selectedWaterAnalysisId: undefined,
      energyIsSource: false,
      assessmentReportVersion: 'AR6'
    } as any,
    facilities: [], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: [],
    accountAnalyses: [{
      guid: `analysis-${accountGuid}`,
      accountId: accountGuid,
      analysisCategory: 'energy',
      modifiedDate: new Date(2026, 0, 1)
    } as any],
    accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [],
    energyUseGroups: [], energyUseEquipment: []
  };
}

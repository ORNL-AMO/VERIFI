import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountAnalysisWorkbenchContext } from '../../account-analysis-workbench-context.service';
import { AccountAnalysisAutosaveService } from '../../editing/account-analysis-autosave.service';
import { AccountAnalysisFacilitySelectionService } from '../../select-facility-items/account-analysis-facility-selection.service';
import { AccountAnalysisResultsService } from './account-analysis-results.service';

describe('AccountAnalysisResultsService browser Worker lifecycle', () => {
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

  it('cancels stale work, ignores display-only edits, and accepts only the current GUID', async () => {
    const draft = signal(analysisFixture());
    configure(draft, signal('saved'), signal('ready'), signal(true));
    const service = TestBed.inject(AccountAnalysisResultsService);
    await settleSignals();
    expect(service.state().state).toBe('loading');
    const first = FakeWorker.instances[0];

    draft.set({ ...draft(), name: 'Renamed', modifiedDate: new Date() });
    await settleSignals();
    expect(FakeWorker.instances).toHaveLength(1);

    draft.set({ ...draft(), baselineYear: 2023 });
    await settleSignals();
    expect(first.terminate).toHaveBeenCalledOnce();
    const second = FakeWorker.instances[1];
    second.emitMessage(completeResponse('other'));
    expect(service.state()).toMatchObject({ state: 'error', message: 'Account analysis calculation returned a stale result.' });
  });

  it('shares one calculation across header and result consumers, clears old analysis results, and tears down pending work', async () => {
    const draft = signal(analysisFixture());
    const autosaveState = signal('saved');
    configure(draft, autosaveState, signal('ready'), signal(true));
    const headerResults = TestBed.inject(AccountAnalysisResultsService);
    await settleSignals();
    const resultPageResults = TestBed.inject(AccountAnalysisResultsService);
    expect(resultPageResults).toBe(headerResults);
    expect(FakeWorker.instances).toHaveLength(1);
    FakeWorker.instances[0].emitMessage(completeResponse('analysis-a'));
    expect(headerResults.state()).toMatchObject({ state: 'ready', analysisGuid: 'analysis-a' });

    draft.set({ ...draft(), name: 'Renamed for header' });
    await settleSignals();
    expect(FakeWorker.instances).toHaveLength(1);
    expect(resultPageResults.state().state).toBe('ready');

    autosaveState.set('dirty');
    await settleSignals();
    expect(headerResults.state()).toMatchObject({ state: 'waiting', reason: 'autosave' });
    autosaveState.set('saved');
    await settleSignals();
    expect(resultPageResults.state().state).toBe('ready');
    expect(FakeWorker.instances).toHaveLength(1);

    draft.set({ ...draft(), guid: 'analysis-b' });
    await settleSignals();
    expect(headerResults.state()).toMatchObject({ state: 'loading', analysisGuid: 'analysis-b' });
    const pending = FakeWorker.instances[1];
    TestBed.resetTestingModule();
    expect(pending.terminate).toHaveBeenCalledOnce();
  });

  it('waits for saved, validated, valid selections before starting work', async () => {
    const autosaveState = signal('dirty');
    const statusState = signal('evaluating');
    const resultsReady = signal(false);
    configure(signal(analysisFixture()), autosaveState, statusState, resultsReady);
    const service = TestBed.inject(AccountAnalysisResultsService);
    await settleSignals();
    expect(service.state()).toMatchObject({ state: 'waiting', reason: 'autosave' });
    expect(FakeWorker.instances).toHaveLength(0);

    autosaveState.set('saved');
    statusState.set('ready');
    await settleSignals();
    expect(service.state()).toMatchObject({ state: 'waiting', reason: 'blocked' });

    resultsReady.set(true);
    await settleSignals();
    expect(service.state().state).toBe('loading');
    expect(FakeWorker.instances).toHaveLength(1);
  });
});

function configure(draft: ReturnType<typeof signal<any>>, autosaveState: ReturnType<typeof signal<any>>, statusState: ReturnType<typeof signal<any>>, resultsReady: ReturnType<typeof signal<boolean>>): void {
  const snapshot = {
    account: { guid: 'account-a', name: 'Account A' }, facilities: [{ guid: 'facility-a' }],
    accountAnalyses: [], facilityAnalyses: [{ guid: 'facility-analysis-a', facilityId: 'facility-a', groups: [] }],
    meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [], accountReports: [], facilityReports: [],
    customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  };
  TestBed.configureTestingModule({ providers: [
    AccountAnalysisResultsService,
    { provide: AccountAnalysisAutosaveService, useValue: { draft, state: autosaveState } },
    { provide: AccountAnalysisFacilitySelectionService, useValue: { resultsReady } },
    { provide: AccountAnalysisWorkbenchContext, useValue: {
      analysis: draft, hasBlockingErrors: signal(false), status: { state: statusState },
      workspace: { snapshot: signal(snapshot), isReady: signal(true), canWrite: signal(true), hasPending: signal(false) }
    } }
  ] });
}

function analysisFixture(): any {
  return {
    guid: 'analysis-a', accountId: 'account-a', name: 'Analysis A', analysisCategory: 'energy',
    baselineYear: 2022, energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal',
    facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: 'facility-analysis-a' }]
  };
}

function completeResponse(itemId: string): unknown {
  return { ok: true, value: { itemId, annualAnalysisSummaries: [], monthlyAnalysisSummaryData: [] } };
}

async function settleSignals(): Promise<void> {
  TestBed.flushEffects(); await Promise.resolve(); TestBed.flushEffects();
}

class FakeWorker {
  static instances: FakeWorker[] = [];
  readonly listeners = new Map<string, Array<(event: MessageEvent | ErrorEvent) => void>>();
  readonly terminate = vi.fn();
  payload: unknown;
  constructor() { FakeWorker.instances.push(this); }
  addEventListener(type: string, listener: (event: MessageEvent | ErrorEvent) => void): void { this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]); }
  postMessage(payload: unknown): void { this.payload = payload; }
  emitMessage(data: unknown): void { if (!this.terminate.mock.calls.length) for (const listener of this.listeners.get('message') ?? []) listener({ data } as MessageEvent); }
}

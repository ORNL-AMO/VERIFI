import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { of } from 'rxjs';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { FacilityAnalysisBankingResultsService } from './facility-analysis-banking-results.service';

describe('FacilityAnalysisBankingResultsService browser Worker lifecycle', () => {
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

  it('posts the source projection through the year before the new baseline with transitive dependencies', async () => {
    configure({ bankedAnalysisYear: 2021, newBaselineYear: 2024 });
    const service = TestBed.inject(FacilityAnalysisBankingResultsService);
    await settleSignals();

    expect(service.state().state).toBe('loading');
    expect(FakeWorker.instances[0].payload).toMatchObject({
      analysisItem: { guid: 'source' },
      groupGuid: 'group-a',
      reportYear: 2023,
      accountAnalysisItems: [{ guid: 'source' }, { guid: 'source-parent' }]
    });
  });

  it('terminates superseded work and ignores stale responses', async () => {
    const harness = configure();
    const service = TestBed.inject(FacilityAnalysisBankingResultsService);
    await settleSignals();
    const first = FakeWorker.instances[0];

    harness.current.set({
      ...harness.current(),
      groups: [{ ...harness.current().groups[0], bankedAnalysisYear: 2022, newBaselineYear: 2023 }]
    });
    await settleSignals();

    expect(first.terminate).toHaveBeenCalledOnce();
    expect(FakeWorker.instances).toHaveLength(2);
    first.emitMessage(response(2021));
    expect(service.state().state).toBe('loading');
    FakeWorker.instances[1].emitMessage(response(2022));
    expect(service.state()).toMatchObject({ state: 'ready', sourceAnalysisGuid: 'source', reportYear: 2022 });
  });

  it('reuses a cached result when inputs return to a completed fingerprint', async () => {
    const harness = configure();
    const service = TestBed.inject(FacilityAnalysisBankingResultsService);
    await settleSignals();
    FakeWorker.instances[0].emitMessage(response(2021));
    expect(service.state()).toMatchObject({ state: 'ready', reportYear: 2021 });

    harness.current.set({
      ...harness.current(),
      groups: [{ ...harness.current().groups[0], bankedAnalysisYear: 2022, newBaselineYear: 2023 }]
    });
    await settleSignals();
    expect(FakeWorker.instances).toHaveLength(2);

    harness.current.set({
      ...harness.current(),
      groups: [{ ...harness.current().groups[0], bankedAnalysisYear: 2021, newBaselineYear: 2022 }]
    });
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(2);
    expect(service.state()).toMatchObject({ state: 'ready', reportYear: 2021 });
    expect(FakeWorker.instances[1].terminate).toHaveBeenCalledOnce();
  });

  it('publishes typed and stale failures and terminates each Worker', async () => {
    configure();
    const service = TestBed.inject(FacilityAnalysisBankingResultsService);
    await settleSignals();
    const worker = FakeWorker.instances[0];
    worker.emitMessage({ ok: false, message: 'source failed' });
    expect(service.state()).toMatchObject({ state: 'error', message: 'source failed' });
    expect(worker.terminate).toHaveBeenCalledOnce();

    TestBed.resetTestingModule();
    FakeWorker.instances = [];
    configure();
    const staleService = TestBed.inject(FacilityAnalysisBankingResultsService);
    await settleSignals();
    const stale = FakeWorker.instances[0];
    stale.emitMessage({ ...response(2021), value: { ...(response(2021) as any).value, itemId: 'other' } });
    expect(staleService.state()).toMatchObject({ state: 'error', message: 'Banking calculation returned a stale result.' });
    expect(stale.terminate).toHaveBeenCalledOnce();
  });

  it('waits for a complete usable configuration and maps transport errors', async () => {
    configure({ configured: false });
    const waiting = TestBed.inject(FacilityAnalysisBankingResultsService);
    await settleSignals();
    expect(waiting.state()).toMatchObject({ state: 'waiting', reason: 'configuration' });
    expect(FakeWorker.instances).toHaveLength(0);

    TestBed.resetTestingModule();
    configure();
    const service = TestBed.inject(FacilityAnalysisBankingResultsService);
    await settleSignals();
    const worker = FakeWorker.instances[0];
    worker.emitError(new ErrorEvent('error', { message: 'transport failed' }));
    expect(service.state()).toMatchObject({ state: 'error', message: 'Banking calculation failed.' });
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('calculates source results while the consuming group regression setup is incomplete', async () => {
    configure({
      statusItems: [{
        severity: 'error',
        code: 'analysis-group.setup.invalid',
        entity: { guid: 'current:group-a' },
        evidence: { reasons: ['missingRegressionModelSelection'], analysisType: 'regression' }
      }]
    });
    const service = TestBed.inject(FacilityAnalysisBankingResultsService);
    await settleSignals();

    expect(service.hasBlockingErrors()).toBe(false);
    expect(service.state().state).toBe('loading');
    expect(FakeWorker.instances).toHaveLength(1);
  });

  it('continues to block invalid banking links and selected source inputs', async () => {
    configure({
      statusItems: [{
        severity: 'error',
        code: 'analysis.configuration.invalid',
        entity: { guid: 'current' },
        evidence: { reasons: ['bankingError'] }
      }]
    });
    const service = TestBed.inject(FacilityAnalysisBankingResultsService);
    await settleSignals();

    expect(service.hasBlockingErrors()).toBe(true);
    expect(service.state()).toMatchObject({ state: 'waiting', reason: 'blocked' });
    expect(FakeWorker.instances).toHaveLength(0);
  });
});

function configure(options: {
  configured?: boolean;
  statusItems?: any[];
  bankedAnalysisYear?: number;
  newBaselineYear?: number;
} = {}) {
  const configured = options.configured ?? true;
  const bankedAnalysisYear = options.bankedAnalysisYear ?? 2021;
  const newBaselineYear = options.newBaselineYear ?? 2022;
  const current = signal(analysis('current', {
    hasBanking: configured,
    bankedAnalysisItemId: configured ? 'source' : undefined,
    groups: [{
      idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption', predictorVariables: [],
      applyBanking: configured, bankedAnalysisYear: configured ? bankedAnalysisYear : undefined,
      newBaselineYear: configured ? newBaselineYear : undefined
    } as any]
  }));
  const parent = analysis('source-parent');
  const source = analysis('source', {
    hasBanking: true,
    bankedAnalysisItemId: parent.guid,
    groups: [{
      idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption', predictorVariables: [],
      applyBanking: true, bankedAnalysisYear: 2019, newBaselineYear: 2020
    } as any]
  });
  const analyses = computed(() => [current(), source, parent]);
  const empty = signal<any[]>([]);
  const statusItems = signal<any[]>(options.statusItems ?? []);
  const workbench = {
    analyses,
    facility: signal({ guid: 'facility-a', fiscalYear: 'calendarYear', fiscalYearMonth: 0, fiscalYearCalendarEnd: true }),
    status: { state: signal('ready'), items: statusItems },
    workspace: {
      isReady: signal(true), facilityMeters: empty, predictorData: empty, predictors: empty,
      facilityAnalyses: analyses
    }
  };
  TestBed.configureTestingModule({ providers: [
    FacilityAnalysisBankingResultsService,
    {
      provide: FacilityAnalysisGroupContext,
      useValue: {
        groupGuid: signal('group-a'), group: computed(() => current().groups[0]),
        workbench, autosave: { draft: current, state: signal('saved') }
      }
    },
    {
      provide: WorkspaceCalendarizationService,
      useValue: {
        calendarizeBase: () => of({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'base-a', meters: [] }),
        currentInputFingerprint: signal('base-a'),
        project: () => ({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'base-a', meters: [] })
      }
    }
  ] });
  return { current };
}

function analysis(guid: string, overrides: Partial<IdbAnalysisItem> = {}): IdbAnalysisItem {
  return {
    guid, accountId: 'account-a', facilityId: 'facility-a', name: guid,
    analysisCategory: 'energy', energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2020,
    hasBanking: false, groups: [{ idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption', predictorVariables: [] } as any],
    ...overrides
  } as IdbAnalysisItem;
}

function response(reportYear: number): any {
  return {
    ok: true,
    value: {
      itemId: 'source', groupGuid: 'group-a', group: analysis('source').groups[0],
      annualAnalysisSummaryData: [], monthlyAnalysisSummaryData: [], reportYear
    }
  };
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
  emitError(error: ErrorEvent): void {
    if (this.terminate.mock.calls.length > 0) return;
    for (const listener of this.listeners.get('error') ?? []) listener(error);
  }
}

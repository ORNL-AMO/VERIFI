import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { of } from 'rxjs';
import { FacilityAnalysisResultsService } from '../../../results/calculation/facility-analysis-results.service';
import { FacilityAnalysisGroupContext } from '../../facility-analysis-group-context.service';
import { FacilityAnalysisGroupResultsService } from './facility-analysis-group-results.service';

describe('FacilityAnalysisGroupResultsService browser Worker lifecycle', () => {
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

  it('calculates a completed group while another group has a blocking error', async () => {
    const harness = configure({ otherGroupBlocked: true });
    const service = TestBed.inject(FacilityAnalysisGroupResultsService);
    await settleSignals();

    expect(service.hasBlockingErrors()).toBe(false);
    expect(service.state().state).toBe('loading');
    expect(FakeWorker.instances).toHaveLength(1);

    FakeWorker.instances[0].emitMessage(completeResponse());
    expect(service.state()).toMatchObject({ state: 'ready', groupGuid: 'group-a', reportYear: 2025 });

    harness.findings.set([finding('analysis-group', 'analysis-a:group-a')]);
    await settleSignals();
    expect(service.state()).toMatchObject({ state: 'waiting', reason: 'blocked' });
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });

  it('reuses the facility result when every group is complete', async () => {
    configure({ otherGroupBlocked: false, facilityReady: true });
    const service = TestBed.inject(FacilityAnalysisGroupResultsService);
    await settleSignals();

    expect(FakeWorker.instances).toHaveLength(0);
    expect(service.state()).toMatchObject({ state: 'ready', groupGuid: 'group-a', reportYear: 2026 });
  });

  it.each([
    ['analysis setup errors', { findings: [finding('facility-analysis', 'analysis-a')] }, 'blocked'],
    ['an unstable autosave', { otherGroupBlocked: true, autosaveState: 'dirty' }, 'autosave'],
    ['status evaluation', { otherGroupBlocked: true, statusState: 'evaluating' }, 'status'],
    ['calendarization', { otherGroupBlocked: true, calendarReady: false }, 'calendarization']
  ] as const)('waits for %s before calculating the group', async (_scenario, options, reason) => {
    configure(options);
    const service = TestBed.inject(FacilityAnalysisGroupResultsService);
    await settleSignals();

    expect(service.state()).toMatchObject({ state: 'waiting', reason });
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it('allows warnings without treating the selected group as blocked', async () => {
    configure({ findings: [{ ...finding('analysis-group', 'analysis-a:group-a'), severity: 'warning' }] });
    const service = TestBed.inject(FacilityAnalysisGroupResultsService);
    await settleSignals();

    expect(service.hasBlockingErrors()).toBe(false);
    expect(service.state().state).toBe('loading');
  });
});

function configure(options: {
  otherGroupBlocked?: boolean;
  facilityReady?: boolean;
  findings?: readonly any[];
  autosaveState?: 'dirty' | 'saved';
  statusState?: 'evaluating' | 'ready';
  calendarReady?: boolean;
}) {
  const analysis = signal(analysisFixture());
  const findings = signal<any[]>([...(options.findings ?? (options.otherGroupBlocked
    ? [finding('analysis-group', 'analysis-a:group-b')]
    : []))]);
  const globalBlocking = computed(() => findings().some(item => item.severity === 'error'));
  const empty = signal<any[]>([]);
  const base = options.calendarReady === false
    ? { state: 'idle' as const }
    : { state: 'ready' as const, accountGuid: 'account-a', inputFingerprint: 'base-a', meters: [] };
  const facilityState = signal<any>(options.facilityReady ? {
    state: 'ready', analysisGuid: 'analysis-a', fingerprint: 'facility-a', reportYear: 2026,
    annual: [], monthly: [],
    groups: [{ group: analysis().groups[0], annualAnalysisSummaryData: [], monthlyAnalysisSummaryData: [] }]
  } : globalBlocking()
    ? { state: 'waiting', analysisGuid: 'analysis-a', reason: 'blocked' }
    : { state: 'loading', analysisGuid: 'analysis-a', fingerprint: 'facility-a' });
  const workbench = {
    analysis,
    analysisGuid: signal('analysis-a'),
    facility: signal({ guid: 'facility-a', fiscalYear: 'calendarYear', fiscalYearMonth: 0, fiscalYearCalendarEnd: true }),
    findings,
    hasBlockingErrors: globalBlocking,
    status: { state: signal(options.statusState ?? 'ready') },
    workspace: {
      isReady: signal(true),
      facilityMeters: empty,
      predictorData: empty,
      predictors: empty,
      facilityAnalyses: computed(() => [analysis()])
    }
  };
  TestBed.configureTestingModule({ providers: [
    FacilityAnalysisGroupResultsService,
    {
      provide: FacilityAnalysisGroupContext,
      useValue: {
        groupGuid: signal('group-a'), group: computed(() => analysis().groups[0]),
        workbench, autosave: { state: signal(options.autosaveState ?? 'saved') }
      }
    },
    { provide: FacilityAnalysisResultsService, useValue: { state: facilityState } },
    {
      provide: WorkspaceCalendarizationService,
      useValue: {
        calendarizeBase: () => of(base), currentInputFingerprint: signal('base-a'),
        project: () => ({ state: 'ready', accountGuid: 'account-a', inputFingerprint: 'base-a', meters: [] })
      }
    }
  ] });
  return { analysis, findings };
}

function analysisFixture(): IdbAnalysisItem {
  return {
    guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Analysis A',
    analysisCategory: 'energy', energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2020,
    hasBanking: false, bankedAnalysisItemId: undefined,
    groups: [
      { idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption', predictorVariables: [] },
      { idbGroupId: 'group-b', analysisType: 'absoluteEnergyConsumption', predictorVariables: [] }
    ]
  } as IdbAnalysisItem;
}

function finding(kind: 'facility-analysis' | 'analysis-group', guid: string): any {
  return { severity: 'error', entity: { kind, guid } };
}

function completeResponse(): unknown {
  return {
    ok: true,
    value: {
      itemId: 'analysis-a', groupGuid: 'group-a', group: analysisFixture().groups[0],
      annualAnalysisSummaryData: [], monthlyAnalysisSummaryData: [], reportYear: 2025
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

  constructor() { FakeWorker.instances.push(this); }
  addEventListener(type: string, listener: (event: MessageEvent | ErrorEvent) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  postMessage(): void {}
  emitMessage(data: unknown): void {
    if (this.terminate.mock.calls.length > 0) return;
    for (const listener of this.listeners.get('message') ?? []) listener({ data } as MessageEvent);
  }
}

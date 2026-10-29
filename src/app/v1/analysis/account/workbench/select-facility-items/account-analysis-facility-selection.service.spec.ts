import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReportAnalysisReturnService } from '@app/v1/shared/reports/report-analysis-return.service';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import { AccountAnalysisAutosaveService } from '../editing/account-analysis-autosave.service';
import { AccountAnalysisFacilitySelectionService } from './account-analysis-facility-selection.service';

describe('AccountAnalysisFacilitySelectionService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('focuses the requested facility and immediately autosaves a reconciled selection', () => {
    const { service, draft, update } = setup({ requestedFacilityGuid: 'facility-b' });
    TestBed.flushEffects();

    expect(service.activeFacilityGuid()).toBe('facility-b');
    service.selectAnalysis('analysis-b');

    expect(update).toHaveBeenCalledOnce();
    expect(draft().facilityAnalysisItems).toEqual([
      { facilityId: 'facility-a', analysisItemId: undefined },
      { facilityId: 'facility-b', analysisItemId: 'analysis-b' }
    ]);
    expect(draft().facilityItemsInitialized).toBe(true);
    expect(draft().isAnalysisVisited).toBe(false);
    expect(update.mock.calls[0][1]).toEqual({ immediate: true, valid: true });
  });

  it('creates regression defaults, links atomically, and opens facility Setup with a return origin', async () => {
    const { service, createLinked, navigate } = setup();
    TestBed.flushEffects();

    expect(await service.createFacilityAnalysis()).toBe(true);
    const command = createLinked.mock.calls[0][0];
    expect(command.analysis).toMatchObject({
      name: 'Energy Analysis', analysisCategory: 'energy', energyIsSource: true, baselineYear: 2022,
      facilityId: 'facility-a'
    });
    expect(command.analysis.groups.map((group: any) => group.analysisType)).toEqual(['regression']);
    expect(navigate).toHaveBeenCalledWith(
      ['/facility', 'facility-a', 'analysis-new', 'setup'],
      { queryParams: {
        returnAccountGuid: 'account-a',
        returnAccountAnalysisGuid: 'account-analysis-a',
        returnFacilityGuid: 'facility-a'
      } }
    );
  });

  it('builds dashboard-compatible detail cards for the focused facility', () => {
    const { service } = setup();
    TestBed.flushEffects();

    expect(service.detailCards().map(card => card.analysis.guid)).toEqual(['analysis-a']);
    expect(service.detailCards()[0]).toMatchObject({ statusLabel: 'Ready', category: 'energy' });
  });

  it('carries the report origin when opening an existing facility analysis', async () => {
    const { service, navigate, update } = setup({ reportOrigin: true }); TestBed.flushEffects();
    expect(await service.openFacilityAnalysis(service.detailCards()[0].analysis)).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/facility', 'facility-a', 'analysis-a', 'setup'], { queryParams: {
      returnReportAccountGuid: 'account-a', returnReportGuid: 'report-a',
      returnAccountGuid: 'account-a', returnAccountAnalysisGuid: 'account-analysis-a', returnFacilityGuid: 'facility-a'
    } });
    expect(update).not.toHaveBeenCalled();
  });

  it('excludes selected analyses with blocking errors from the valid count', () => {
    const { service } = setup({
      facilityAnalysisItems: [
        { facilityId: 'facility-a', analysisItemId: 'analysis-a' },
        { facilityId: 'facility-b', analysisItemId: 'skip' }
      ],
      findings: [{
        code: 'analysis.configuration.invalid',
        severity: 'error',
        entity: { kind: 'facility-analysis', guid: 'analysis-a', facilityGuid: 'facility-a' }
      }]
    });
    TestBed.flushEffects();

    expect(service.assignedCount()).toBe(2);
    expect(service.validCount()).toBe(1);
    expect(service.resultsReady()).toBe(false);
  });
});

function setup(options: {
  reportOrigin?: boolean;
  requestedFacilityGuid?: string;
  facilityAnalysisItems?: readonly { facilityId: string; analysisItemId?: string }[];
  findings?: readonly any[];
} = {}) {
  const account = { guid: 'account-a' } as any;
  const facilityA = {
    guid: 'facility-a', accountId: 'account-a', name: 'Facility A', energyUnit: 'kWh', volumeLiquidUnit: 'gal',
    sustainabilityQuestions: { energyReductionBaselineYear: 2020, waterReductionBaselineYear: 2020 }
  } as any;
  const facilityB = {
    ...facilityA, guid: 'facility-b', name: 'Facility B'
  };
  const analysisA = {
    guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Analysis A',
    analysisCategory: 'energy', energyIsSource: true, baselineYear: 2022, groups: [], modifiedDate: new Date()
  } as any;
  const analysisB = {
    ...analysisA, guid: 'analysis-b', facilityId: 'facility-b', name: 'Analysis B'
  };
  const draft = signal({
    guid: 'account-analysis-a', accountId: 'account-a', name: 'Account plan',
    analysisCategory: 'energy', energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2022,
    facilityAnalysisItems: options.facilityAnalysisItems ?? [
      { facilityId: 'facility-a', analysisItemId: undefined },
      { facilityId: 'deleted', analysisItemId: 'old' }
    ], isAnalysisVisited: true
  } as any);
  const update = vi.fn((mutator: (value: any) => void, _options?: { immediate?: boolean; valid?: boolean }) => {
    const next = structuredClone(draft());
    mutator(next);
    draft.set(next);
  });
  const created = {
    analysis: { ...analysisA, guid: 'analysis-new' },
    accountAnalysis: { ...draft(), facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: 'analysis-new' }] }
  };
  const createLinked = vi.fn().mockResolvedValue(created);
  const execute = vi.fn(async (_request, persist: () => Promise<any>) => ({ value: await persist(), change: {} }));
  const navigate = vi.fn().mockResolvedValue(true);
  const params = convertToParamMap(options.requestedFacilityGuid ? { facilityGuid: options.requestedFacilityGuid } : {});

  TestBed.configureTestingModule({ providers: [
    ...(options.reportOrigin ? [{ provide: ReportAnalysisReturnService, useValue: { queryParams: () => ({ returnReportAccountGuid: 'account-a', returnReportGuid: 'report-a' }) } }] : []),
    AccountAnalysisFacilitySelectionService,
    {
      provide: AccountAnalysisWorkbenchContext,
      useValue: {
        account: signal(account), analysis: signal(draft()), facilities: signal([facilityA, facilityB]),
        facilityAnalyses: signal([analysisA, analysisB]),
        status: { items: signal(options.findings ?? []), state: signal('ready') },
        workspace: {
          canWrite: signal(true), hasPending: signal(false), selectedFacility: signal(undefined),
          accountAnalyses: signal([draft()]), facilityReports: signal([]),
          meterGroups: signal([{ guid: 'group-a', accountId: 'account-a', facilityId: 'facility-a', groupType: 'Energy' }]),
          predictors: signal([]), meters: signal([]), meterData: signal([]), predictorData: signal([])
        }
      }
    },
    {
      provide: AccountAnalysisAutosaveService,
      useValue: { draft, state: signal('saved'), update, flush: vi.fn().mockResolvedValue(true) }
    },
    { provide: WorkspaceCommandBoundary, useValue: { execute } },
    { provide: AnalysisCommandHandler, useValue: { createLinkedFacilityAnalysisForAccount: createLinked } },
    {
      provide: WorkspaceNavigationService,
      useValue: { facilityAnalysisWorkbenchRoute: (facilityGuid: string, analysisGuid: string) => ['/facility', facilityGuid, analysisGuid, 'setup'] }
    },
    { provide: Router, useValue: { navigate } },
    { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: params }, queryParamMap: of(params) } }
  ] });
  return { service: TestBed.inject(AccountAnalysisFacilitySelectionService), draft, update, createLinked, navigate };
}

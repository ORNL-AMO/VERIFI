import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, defer, firstValueFrom, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { deleteWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { RouterGuardService } from '@shared/shared-router-guard-modal/router-guard-service';
import { DataEvaluationService } from '@v0/data-evaluation/data-evaluation.service';
import { AccountAnalysisBannerComponent } from './account-analysis-banner/account-analysis-banner.component';
import { AccountAnalysisFooterComponent } from './account-analysis-footer/account-analysis-footer.component';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { AccountAnalysisTestingModule } from './account-analysis-testing.module';
import { AccountAnalysisService } from './account-analysis.service';
import { AccountAnalysisSetupComponent } from './account-analysis-setup/account-analysis-setup.component';
import { SelectItemTableComponent } from './select-facility-analysis-items/select-item-table/select-item-table.component';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(complete => resolve = complete);
  return { promise, resolve };
}

function createHarness(delayFirstWrite = true, facilitySuffixes = ['a', 'b']) {
  const store = new AccountWorkspaceStore();
  const account = {
    id: 1, guid: 'account-a', name: 'Account A', energyUnit: 'MMBtu', volumeLiquidUnit: 'kgal', energyIsSource: false,
    sustainabilityQuestions: { energyReductionBaselineYear: 2020, waterReductionBaselineYear: 2020 }
  } as any;
  const facilities = facilitySuffixes.map((suffix, index) => ({
    id: index + 2, guid: `facility-${suffix}`, accountId: account.guid, name: `Facility ${suffix}`,
    isNewFacility: false, energyIsSource: false, energyUnit: 'MMBtu', volumeLiquidUnit: 'kgal',
    sustainabilityQuestions: { energyReductionBaselineYear: 2020, waterReductionBaselineYear: 2020 }
  } as IdbFacility));
  const analysis = {
    id: 4, guid: 'account-analysis-a', accountId: account.guid, name: 'Original', analysisCategory: 'energy',
    baselineYear: 2020, energyUnit: 'MMBtu', waterUnit: 'kgal', energyIsSource: false, hasBanking: false,
    isAnalysisVisited: true, facilityItemsInitialized: true,
    facilityAnalysisItems: facilities.map(facility => ({ facilityId: facility.guid, analysisItemId: undefined }))
  } as IdbAccountAnalysisItem;
  const otherAnalysis = { ...structuredClone(analysis), id: 5, guid: 'account-analysis-b', name: 'Other analysis' };
  const models = facilities.map((facility, index) => ({
    id: index + 6, guid: `model-${index}`, accountId: account.guid, facilityId: facility.guid,
    analysisCategory: 'energy', baselineYear: 2020, energyIsSource: false, groups: []
  } as IdbAnalysisItem));
  const snapshot = {
    account, facilities, meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: models, accountAnalyses: [analysis, otherAnalysis], accountReports: [], facilityReports: [],
    customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  } as unknown as AccountWorkspaceSnapshot;
  store.publish(snapshot, { facility: facilities[0], accountAnalysis: analysis });

  const storedAnalyses = new Map(snapshot.accountAnalyses.map(item => [item.guid, structuredClone(item)]));
  const storedModels = new Map(snapshot.facilityAnalyses.map(item => [item.guid, structuredClone(item)]));
  const firstWriteStarted = deferred();
  const releaseFirstWrite = deferred();
  let updateCount = 0;
  const updateWithObservable = vi.fn((value: IdbAccountAnalysisItem) => defer(async () => {
    if (++updateCount === 1) {
      firstWriteStarted.resolve();
      if (delayFirstWrite) await releaseFirstWrite.promise;
    }
    const stored = structuredClone(value);
    storedAnalyses.set(stored.guid, stored);
    return stored;
  }));
  const addWithObservable = vi.fn((value: IdbAnalysisItem) => {
    const stored = { ...structuredClone(value), id: 20 + storedModels.size, guid: `created-${storedModels.size}` };
    storedModels.set(stored.guid, stored);
    return of(stored);
  });
  const handler = new AnalysisCommandHandler(
    { addWithObservable, getStoredByGuid: vi.fn(async (guid: string) => storedModels.get(guid)) } as any,
    { updateWithObservable } as any,
    store
  );
  const selectAccountAnalysis = vi.fn((guid: string) => {
    store.setSelections({ ...store.selections(), accountAnalysis: store.accountAnalyses().find(item => item.guid === guid) });
  });
  const workspaceService = {
    selectAccountAnalysis,
    selectFacility: vi.fn((guid: string) => store.selectFacility(store.facilities().find(facility => facility.guid === guid))),
    selectFacilityAnalysis: vi.fn(),
    reloadActiveWorkspace: vi.fn(async () => {
      store.publishCommitted({
        ...store.snapshot(),
        accountAnalyses: [...storedAnalyses.values()],
        facilityAnalyses: [...storedModels.values()]
      }, store.selections());
      return 'published' as const;
    })
  };
  const boundary = new WorkspaceCommandBoundary(store, workspaceService as any);
  const accountAnalysisItem = new BehaviorSubject<IdbAccountAnalysisItem | undefined>(undefined);
  const navigateByUrl = vi.fn();
  const router = { navigateByUrl, events: new Subject(), url: '/data-evaluation/account/analysis/setup' };
  TestBed.configureTestingModule({
    imports: [AccountAnalysisTestingModule],
    providers: [
      FormBuilder,
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: AccountWorkspaceService, useValue: workspaceService },
      { provide: WorkspaceCommandBoundary, useValue: boundary },
      { provide: AnalysisCommandHandler, useValue: handler },
      { provide: Router, useValue: router },
      { provide: LoadingService, useValue: { setLoadingMessage: vi.fn(), setLoadingStatus: vi.fn() } },
      { provide: AnalysisService, useValue: { accountAnalysisItem } },
      { provide: SharedDataService, useValue: { modalOpen: new BehaviorSubject(false) } },
      { provide: AccountStatusCheckService, useValue: { accountStatusCheck: new BehaviorSubject(undefined) } },
      { provide: CalanderizationService, useValue: { calanderizedMeters: new BehaviorSubject([]) } },
      { provide: ToastNotificationsService, useValue: { showToast: vi.fn() } },
      { provide: AccountAnalysisService, useValue: new AccountAnalysisService() },
      { provide: DataEvaluationService, useValue: { helpWidthBs: new BehaviorSubject(0), sidebarWidthBs: new BehaviorSubject(0) } }
    ]
  });
  const table = TestBed.runInInjectionContext(() => new SelectItemTableComponent());
  const setup = TestBed.runInInjectionContext(() => new AccountAnalysisSetupComponent());
  TestBed.flushEffects();
  return {
    store, table, setup, analysis, otherAnalysis, facilities, models, storedAnalyses, storedModels,
    firstWriteStarted, releaseFirstWrite, updateWithObservable, addWithObservable,
    selectAccountAnalysis, selectFacility: workspaceService.selectFacility, selectFacilityAnalysis: workspaceService.selectFacilityAnalysis, accountAnalysisItem, navigateByUrl, router, boundary
  };
}

describe('Account analysis queued edits', () => {
  afterEach(() => { vi.useRealTimers(); TestBed.resetTestingModule(); });

  it('preserves assignments to different facilities submitted before the first save publishes', async () => {
    const h = createHarness();
    const first = h.table.save(h.models[0].guid);
    h.store.selectFacility(h.facilities[1]);
    const second = h.table.save(h.models[1].guid);
    await h.firstWriteStarted.promise;
    h.releaseFirstWrite.resolve();
    await Promise.all([first, second]);

    expect(h.storedAnalyses.get(h.analysis.guid).facilityAnalysisItems).toEqual([
      { facilityId: h.facilities[0].guid, analysisItemId: h.models[0].guid },
      { facilityId: h.facilities[1].guid, analysisItemId: h.models[1].guid }
    ]);
  });

  it('saves setup fields without undoing a queued assignment or changing the current analysis', async () => {
    const h = createHarness();
    const assignment = h.table.save(h.models[0].guid);
    h.setup.form.patchValue({ name: 'Renamed' }, { emitEvent: false });
    const setup = h.setup.saveItem();
    h.store.setSelections({ ...h.store.selections(), accountAnalysis: h.otherAnalysis });
    await h.firstWriteStarted.promise;
    h.releaseFirstWrite.resolve();
    await Promise.all([assignment, setup]);

    expect(h.storedAnalyses.get(h.analysis.guid)).toMatchObject({
      name: 'Renamed',
      facilityAnalysisItems: [{ facilityId: h.facilities[0].guid, analysisItemId: h.models[0].guid },
        { facilityId: h.facilities[1].guid, analysisItemId: undefined }]
    });
    expect(h.store.selectedAccountAnalysis().guid).toBe(h.otherAnalysis.guid);
    expect(h.selectAccountAnalysis).not.toHaveBeenCalled();
  });

  it('clears assignments without restoring setup fields from an older snapshot', async () => {
    const h = createHarness();
    h.setup.form.patchValue({ name: 'Renamed' }, { emitEvent: false });
    const setup = h.setup.saveItem();
    const reset = h.setup.confirmEnableForm();
    await h.firstWriteStarted.promise;
    h.releaseFirstWrite.resolve();
    await Promise.all([setup, reset]);

    expect(h.storedAnalyses.get(h.analysis.guid)).toMatchObject({ name: 'Renamed', facilityItemsInitialized: false });
    expect(h.storedAnalyses.get(h.analysis.guid).facilityAnalysisItems.every(item => item.analysisItemId === undefined)).toBe(true);
    expect(h.selectAccountAnalysis).not.toHaveBeenCalled();
  });

  it('links a created analysis without losing a preceding facility assignment', async () => {
    const h = createHarness();
    h.store.selectFacility(h.facilities[1]);
    const assignment = h.table.save(h.models[1].guid);
    h.store.selectFacility(h.facilities[0]);
    const creation = h.table.confirmCreateNew();
    await h.firstWriteStarted.promise;
    h.releaseFirstWrite.resolve();
    await Promise.all([assignment, creation]);

    const created = [...h.storedModels.values()].find(item => item.guid.startsWith('created-'));
    expect(h.storedAnalyses.get(h.analysis.guid).facilityAnalysisItems).toEqual([
      { facilityId: h.facilities[0].guid, analysisItemId: created.guid },
      { facilityId: h.facilities[1].guid, analysisItemId: h.models[1].guid }
    ]);
    expect(h.accountAnalysisItem.value).toEqual(h.storedAnalyses.get(h.analysis.guid));
  });

  it('links bulk-created analyses without restoring earlier setup fields', async () => {
    const h = createHarness();
    h.setup.form.patchValue({ name: 'Renamed' }, { emitEvent: false });
    const setup = h.setup.saveItem();
    const bulk = h.setup.confirmBulkAnalysisCreate();
    await h.firstWriteStarted.promise;
    h.releaseFirstWrite.resolve();
    await Promise.all([setup, bulk]);

    const stored = h.storedAnalyses.get(h.analysis.guid);
    expect(stored.name).toBe('Renamed');
    for (const assignment of stored.facilityAnalysisItems) {
      expect(h.storedModels.get(assignment.analysisItemId)).toMatchObject({ facilityId: assignment.facilityId });
    }
    expect(h.selectAccountAnalysis).not.toHaveBeenCalled();
  });

  it.each(['accountAnalyses', 'facilities'] as const)('does not write a queued assignment after its %s owner disappears', async collection => {
    const h = createHarness(false);
    const blocked = deferred();
    const blocker = h.boundary.execute(
      { entityKind: 'account', changeKind: 'update', label: 'Earlier command', publication: { mode: 'patch', buildPatch: () => ({ collections: [] }) } },
      () => blocked.promise
    );
    const assignment = h.table.save(h.models[0].guid);
    const completion = collection === 'accountAnalyses'
      ? expect(assignment).resolves.toBeUndefined()
      : expect(assignment).rejects.toMatchObject({ code: 'validation-failed' });
    h.store.publishCommittedPatch(deleteWorkspaceRecords(collection, {
      guids: [collection === 'accountAnalyses' ? h.analysis.guid : h.facilities[0].guid]
    }));
    TestBed.flushEffects();
    h.navigateByUrl.mockClear();
    blocked.resolve();
    await blocker;
    await completion;

    expect(h.updateWithObservable).not.toHaveBeenCalled();
    expect(h.navigateByUrl).not.toHaveBeenCalled();
    expect(h.selectAccountAnalysis).not.toHaveBeenCalled();
    expect(h.selectFacilityAnalysis).not.toHaveBeenCalled();
    if (collection === 'accountAnalyses') {
      expect(h.store.accountAnalyses().some(item => item.guid === h.analysis.guid)).toBe(false);
      expect(h.table.saveError()).toBeUndefined();
    }
  });

  it.each([
    ['single', 'accountAnalyses'], ['single', 'facilities'],
    ['bulk', 'accountAnalyses'], ['bulk', 'facilities']
  ] as const)('does not create records when a queued %s creation loses its %s owner', async (kind, collection) => {
    const h = createHarness(false);
    const blocked = deferred();
    const blocker = h.boundary.execute(
      { entityKind: 'account', changeKind: 'update', label: 'Earlier command', publication: { mode: 'patch', buildPatch: () => ({ collections: [] }) } },
      () => blocked.promise
    );
    const creation = kind === 'single' ? h.table.confirmCreateNew() : h.setup.confirmBulkAnalysisCreate();
    const completion = kind === 'bulk' && collection === 'facilities'
      ? expect(creation).rejects.toMatchObject({ code: 'validation-failed' })
      : expect(creation).resolves.toBeUndefined();
    h.store.publishCommittedPatch(deleteWorkspaceRecords(collection, {
      guids: [collection === 'accountAnalyses' ? h.analysis.guid : h.facilities[0].guid]
    }));
    TestBed.flushEffects();
    h.navigateByUrl.mockClear();
    blocked.resolve();
    await blocker;
    await completion;

    expect(h.addWithObservable).not.toHaveBeenCalled();
    expect(h.updateWithObservable).not.toHaveBeenCalled();
    expect(h.navigateByUrl).not.toHaveBeenCalled();
    expect(h.selectAccountAnalysis).not.toHaveBeenCalled();
    expect(h.selectFacilityAnalysis).not.toHaveBeenCalled();
  });
  it('autosaves the latest valid setup values after a 300ms typing pause', async () => {
    vi.useFakeTimers();
    const h = createHarness(false);
    h.setup.form.controls.name.setValue('N');
    h.setup.form.controls.name.setValue('New name');
    await vi.advanceTimersByTimeAsync(299);
    expect(h.updateWithObservable).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(h.updateWithObservable).toHaveBeenCalledTimes(1);
    expect(h.storedAnalyses.get(h.analysis.guid).name).toBe('New name');
  });

  it('finishes pending setup edits before leaving without showing a confirmation on success', async () => {
    const h = createHarness();
    h.setup.form.controls.name.setValue('New name');
    const leaving = h.setup.canDeactivate();
    await h.firstWriteStarted.promise;
    expect(h.setup.saving()).toBe(true);
    expect(TestBed.inject(RouterGuardService).showModal.value).toBe(false);
    h.releaseFirstWrite.resolve();
    expect(await leaving).toBe(true);
    expect(h.storedAnalyses.get(h.analysis.guid).name).toBe('New name');
  });

  it('saves a newer draft after the in-flight setup save without erasing the new value', async () => {
    const h = createHarness();
    h.setup.form.controls.name.setValue('First');
    const firstFlush = h.setup.flushChanges();
    await h.firstWriteStarted.promise;
    h.setup.form.controls.name.setValue('Latest');
    const finalFlush = h.setup.flushChanges();
    expect(h.updateWithObservable).toHaveBeenCalledTimes(1);
    h.releaseFirstWrite.resolve();
    expect(await firstFlush).toBe(true);
    expect(await finalFlush).toBe(true);
    expect(h.updateWithObservable).toHaveBeenCalledTimes(2);
    expect(h.storedAnalyses.get(h.analysis.guid).name).toBe('Latest');
  });

  it('keeps invalid edits on cancel and discards them only after the explicit choice', async () => {
    const h = createHarness(false);
    const guard = TestBed.inject(RouterGuardService);
    h.setup.form.controls.name.setValue('');
    const firstLeave = h.setup.canDeactivate();
    expect(h.setup.canDeactivate()).toBe(firstLeave);
    await Promise.resolve();
    expect(guard.showModal.value).toBe(true);
    expect(guard.showSave.value).toBe(false);
    guard.setModalAction('cancel');
    expect(await firstLeave).toBe(false);
    expect(h.setup.form.controls.name.value).toBe('');
    expect(h.updateWithObservable).not.toHaveBeenCalled();

    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    h.setup.warnBeforeUnload(event);
    expect(event.defaultPrevented).toBe(true);
    const secondLeave = h.setup.canDeactivate();
    await Promise.resolve();
    guard.setModalAction('discard');
    expect(await secondLeave).toBe(true);
    expect(h.setup.form.controls.name.value).toBe('Original');
    expect(h.updateWithObservable).not.toHaveBeenCalled();
  });

  it('retains failed setup edits and allows an inline retry', async () => {
    vi.useFakeTimers();
    const h = createHarness(false);
    h.updateWithObservable.mockImplementationOnce(() => throwError(() => new Error('disk unavailable')));
    h.setup.form.controls.name.setValue('Retry this');
    await vi.advanceTimersByTimeAsync(300);
    expect(h.setup.saveError()).toContain('could not be saved');
    expect(h.setup.form.controls.name.value).toBe('Retry this');
    expect(h.storedAnalyses.get(h.analysis.guid).name).toBe('Original');

    h.setup.retrySave();
    expect(await h.setup.flushChanges()).toBe(true);
    expect(h.setup.saveError()).toBeUndefined();
    expect(h.storedAnalyses.get(h.analysis.guid).name).toBe('Retry this');
  });

  it('keeps the latest radio choice when an earlier selection is still saving', async () => {
    const h = createHarness();
    const first = h.table.save(h.models[0].guid);
    await h.firstWriteStarted.promise;
    const latest = h.table.save('skip');
    expect(h.table.selectedFacilityItemId()).toBe('skip');
    expect(h.updateWithObservable).toHaveBeenCalledTimes(1);
    h.releaseFirstWrite.resolve();
    await Promise.all([first, latest]);
    expect(h.storedAnalyses.get(h.analysis.guid).facilityAnalysisItems[0].analysisItemId).toBe('skip');
    expect(h.table.selectedFacilityItemId()).toBe('skip');
  });

  it('waits for a radio selection before Continue switches to the next facility', async () => {
    const h = createHarness();
    h.router.url = '/data-evaluation/account/analysis/select-items';
    const footer = TestBed.runInInjectionContext(() => new AccountAnalysisFooterComponent());
    footer.beforeNavigate = () => h.table.canDeactivate();
    const saving = h.table.save(h.models[0].guid);
    const leaving = footer.continue();
    await h.firstWriteStarted.promise;
    expect(h.selectFacility).not.toHaveBeenCalled();
    h.releaseFirstWrite.resolve();
    await Promise.all([saving, leaving]);
    expect(h.selectFacility).toHaveBeenCalledWith(h.facilities[1].guid);
  });

  it('does not change the analysis owner before the current editor permits navigation', async () => {
    const h = createHarness(false);
    const banner = TestBed.runInInjectionContext(() => new AccountAnalysisBannerComponent());
    const ready = deferred();
    banner.beforeNavigate = async () => { await ready.promise; return true; };
    const switching = banner.selectItem(h.otherAnalysis);
    expect(h.selectAccountAnalysis).not.toHaveBeenCalled();
    expect(h.store.selectedAccountAnalysis().guid).toBe(h.analysis.guid);
    ready.resolve();
    await switching;
    expect(h.selectAccountAnalysis).toHaveBeenCalledWith(h.otherAnalysis.guid);
    expect(h.navigateByUrl).toHaveBeenCalledWith('/data-evaluation/account/analysis/setup');
  });

  it('keeps the current facility and analysis when the editor cancels leaving', async () => {
    const h = createHarness(false);
    h.router.url = '/data-evaluation/account/analysis/select-items';
    const footer = TestBed.runInInjectionContext(() => new AccountAnalysisFooterComponent());
    const banner = TestBed.runInInjectionContext(() => new AccountAnalysisBannerComponent());
    footer.beforeNavigate = () => Promise.resolve(false);
    banner.beforeNavigate = () => Promise.resolve(false);
    await footer.continue();
    await footer.goBack();
    await footer.returnToDashboard();
    await banner.selectItem(h.otherAnalysis);
    expect(h.selectFacility).not.toHaveBeenCalled();
    expect(h.selectAccountAnalysis).not.toHaveBeenCalled();
    expect(h.navigateByUrl).not.toHaveBeenCalled();
  });

  it('stops draining local drafts when the editor is destroyed during a save', async () => {
    const h = createHarness();
    h.setup.form.controls.name.setValue('First');
    const flushing = h.setup.flushChanges();
    await h.firstWriteStarted.promise;
    h.setup.form.controls.name.setValue('Unsubmitted later edit');
    TestBed.resetTestingModule();
    h.releaseFirstWrite.resolve();
    expect(await flushing).toBe(false);
    expect(h.updateWithObservable).toHaveBeenCalledTimes(1);
    expect(h.storedAnalyses.get(h.analysis.guid).name).toBe('First');
  });

  it('does not navigate or select a created analysis after its displayed owner changes', async () => {
    const h = createHarness(false);
    const started = deferred();
    const complete = deferred();
    const add = h.addWithObservable.getMockImplementation();
    h.addWithObservable.mockImplementationOnce(value => defer(async () => {
      started.resolve();
      await complete.promise;
      return firstValueFrom(add(value));
    }));
    const creating = h.table.confirmCreateNew();
    await started.promise;
    h.store.setSelections({ facility: h.facilities[1], accountAnalysis: h.otherAnalysis });
    complete.resolve();
    await creating;
    expect(h.storedAnalyses.get(h.analysis.guid).facilityAnalysisItems[0].analysisItemId).toMatch(/^created-/);
    expect(h.store.selectedAccountAnalysis().guid).toBe(h.otherAnalysis.guid);
    expect(h.store.selectedFacility().guid).toBe(h.facilities[1].guid);
    expect(h.selectFacilityAnalysis).not.toHaveBeenCalled();
    expect(h.navigateByUrl).not.toHaveBeenCalled();
    expect(h.accountAnalysisItem.value).toBeUndefined();
  });

  it('does not reopen account analysis selection after a stale bulk creation completes', async () => {
    const h = createHarness(false);
    const started = deferred();
    const complete = deferred();
    const add = h.addWithObservable.getMockImplementation();
    h.addWithObservable.mockImplementationOnce(value => defer(async () => {
      started.resolve();
      await complete.promise;
      return firstValueFrom(add(value));
    }));
    const creating = h.setup.confirmBulkAnalysisCreate();
    await started.promise;
    h.store.setSelections({ ...h.store.selections(), accountAnalysis: h.otherAnalysis });
    complete.resolve();
    await creating;
    expect(h.storedAnalyses.get(h.analysis.guid).facilityAnalysisItems.every(item => item.analysisItemId?.startsWith('created-'))).toBe(true);
    expect(h.store.selectedAccountAnalysis().guid).toBe(h.otherAnalysis.guid);
    expect(h.navigateByUrl).not.toHaveBeenCalled();
    expect(TestBed.inject(ToastNotificationsService).showToast).not.toHaveBeenCalled();
  });

  it('does not close another analysis confirmation after a reset finishes', async () => {
    const h = createHarness();
    const resetting = h.setup.confirmEnableForm();
    await h.firstWriteStarted.promise;
    h.store.setSelections({ ...h.store.selections(), accountAnalysis: h.otherAnalysis });
    h.setup.displayEnableForm = true;
    h.releaseFirstWrite.resolve();
    await resetting;
    expect(h.store.selectedAccountAnalysis().guid).toBe(h.otherAnalysis.guid);
    expect(h.setup.displayEnableForm).toBe(true);
  });

  it('does not let an older Continue replace a newer navigation waiting on the save', async () => {
    const h = createHarness();
    h.router.url = '/data-evaluation/account/analysis/select-items';
    const footer = TestBed.runInInjectionContext(() => new AccountAnalysisFooterComponent());
    footer.beforeNavigate = () => h.table.canDeactivate();
    const saving = h.table.save(h.models[0].guid);
    const continuing = footer.continue();
    await h.firstWriteStarted.promise;
    Object.assign(h.router, { currentNavigation: () => ({ id: 2 }) });
    h.releaseFirstWrite.resolve();
    await Promise.all([saving, continuing]);
    expect(h.selectFacility).not.toHaveBeenCalled();
    expect(h.navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not change analysis selection after another destination wins while leaving is checked', async () => {
    const h = createHarness(false);
    const banner = TestBed.runInInjectionContext(() => new AccountAnalysisBannerComponent());
    const ready = deferred();
    banner.beforeNavigate = async () => { await ready.promise; return true; };
    const switching = banner.selectItem(h.otherAnalysis);
    h.router.url = '/data-evaluation/account/reports';
    ready.resolve();
    await switching;
    expect(h.selectAccountAnalysis).not.toHaveBeenCalled();
    expect(h.navigateByUrl).not.toHaveBeenCalled();
  });


  it('does not discard a newly selected analysis draft through an older setup dialog', async () => {
    const h = createHarness(false);
    const guard = TestBed.inject(RouterGuardService);
    h.setup.form.controls.name.setValue('');
    const leaving = h.setup.canDeactivate();
    await Promise.resolve();
    expect(guard.showModal.value).toBe(true);
    h.store.setSelections({ ...h.store.selections(), accountAnalysis: h.otherAnalysis });
    TestBed.flushEffects();
    h.setup.form.controls.name.setValue('New owner draft');
    guard.setModalAction('discard');
    expect(await leaving).toBe(false);
    expect(h.setup.form.controls.name.value).toBe('New owner draft');
    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    h.setup.warnBeforeUnload(event);
    expect(event.defaultPrevented).toBe(true);
    expect(await h.setup.flushChanges()).toBe(true);
    expect(h.storedAnalyses.get(h.otherAnalysis.guid).name).toBe('New owner draft');
  });

  it('does not discard a new owner radio draft through an older failed-save dialog', async () => {
    const h = createHarness(false);
    const guard = TestBed.inject(RouterGuardService);
    const persist = h.updateWithObservable.getMockImplementation();
    h.updateWithObservable.mockImplementationOnce(() => throwError(() => new Error('old owner failed')));
    await expect(h.table.save(h.models[0].guid)).rejects.toBeDefined();
    const leaving = h.table.canDeactivate();
    await Promise.resolve();
    expect(guard.showModal.value).toBe(true);
    expect(h.updateWithObservable).toHaveBeenCalledTimes(1);
    h.store.setSelections({ ...h.store.selections(), accountAnalysis: h.otherAnalysis });
    const started = deferred();
    const complete = deferred();
    h.updateWithObservable.mockImplementationOnce(() => throwError(() => new Error('stale owner failed')));
    h.updateWithObservable.mockImplementationOnce(value => defer(async () => {
      started.resolve();
      await complete.promise;
      return firstValueFrom(persist(value));
    }));
    const saving = h.table.save('skip');
    await started.promise;
    guard.setModalAction('discard');
    expect(await leaving).toBe(false);
    expect(h.table.selectedFacilityItemId()).toBe('skip');
    complete.resolve();
    await saving;
    expect(h.storedAnalyses.get(h.otherAnalysis.guid).facilityAnalysisItems[0].analysisItemId).toBe('skip');
  });

  it('does not apply an old setup failure to a newer owner draft', async () => {
    const h = createHarness(false);
    const started = deferred();
    const fail = deferred();
    h.updateWithObservable.mockImplementationOnce(() => defer(async () => {
      started.resolve();
      await fail.promise;
      throw new Error('old owner failed');
    }));
    h.setup.form.controls.name.setValue('Old owner draft');
    const oldFlush = h.setup.flushChanges();
    await started.promise;
    h.store.setSelections({ ...h.store.selections(), accountAnalysis: h.otherAnalysis });
    TestBed.flushEffects();
    h.setup.form.controls.name.setValue('New owner draft');
    const currentFlush = h.setup.flushChanges();
    fail.resolve();
    expect(await oldFlush).toBe(false);
    expect(await currentFlush).toBe(true);
    expect(h.setup.saveError()).toBeUndefined();
    expect(h.storedAnalyses.get(h.otherAnalysis.guid).name).toBe('New owner draft');
  });

  it('continues the newer owner radio save after an old owner failure', async () => {
    const h = createHarness(false);
    const started = deferred();
    const fail = deferred();
    h.updateWithObservable.mockImplementationOnce(() => defer(async () => {
      started.resolve();
      await fail.promise;
      throw new Error('old owner failed');
    }));
    const oldSave = h.table.save(h.models[0].guid);
    await started.promise;
    h.store.setSelections({ ...h.store.selections(), accountAnalysis: h.otherAnalysis });
    const currentSave = h.table.save('skip');
    fail.resolve();
    await Promise.all([oldSave, currentSave]);
    expect(h.table.saveError()).toBeUndefined();
    expect(h.storedAnalyses.get(h.otherAnalysis.guid).facilityAnalysisItems[0].analysisItemId).toBe('skip');
    expect(h.storedAnalyses.get(h.analysis.guid).facilityAnalysisItems[0].analysisItemId).toBeUndefined();
  });

  it('asks about a known setup save failure before attempting another write on leave', async () => {
    const h = createHarness(false);
    const guard = TestBed.inject(RouterGuardService);
    h.updateWithObservable.mockImplementationOnce(() => throwError(() => new Error('disk unavailable')));
    h.setup.form.controls.name.setValue('Retained draft');
    expect(await h.setup.flushChanges()).toBe(false);
    const leaving = h.setup.canDeactivate();
    await Promise.resolve();
    expect(guard.showModal.value).toBe(true);
    expect(h.updateWithObservable).toHaveBeenCalledTimes(1);
    guard.setModalAction('cancel');
    expect(await leaving).toBe(false);
    expect(h.setup.form.controls.name.value).toBe('Retained draft');
  });

  it.each(['continue', 'goBack', 'returnToDashboard'] as const)('ignores a second %s while Continue waits for the current assignment', async duplicateAction => {
    const h = createHarness(true, ['a', 'b', 'c']);
    h.router.url = '/data-evaluation/account/analysis/select-items';
    TestBed.inject(AccountStatusCheckService).accountStatusCheck.next({
      getAccountAnalysisStatusCheckById: () => ({ accountAnalysisSetupErrors: { hasSetupErrors: false } })
    } as any);
    const footer = TestBed.runInInjectionContext(() => new AccountAnalysisFooterComponent());
    const beforeNavigate = vi.fn(() => h.table.canDeactivate());
    footer.beforeNavigate = beforeNavigate;
    const saving = h.table.save(h.models[0].guid);
    const continuing = footer.continue();
    const duplicate = footer[duplicateAction]();
    await h.firstWriteStarted.promise;
    h.releaseFirstWrite.resolve();
    await Promise.all([saving, continuing, duplicate]);

    expect(beforeNavigate).toHaveBeenCalledTimes(1);
    expect(h.selectFacility).toHaveBeenCalledExactlyOnceWith(h.facilities[1].guid);
    expect(h.store.selectedFacility().guid).toBe(h.facilities[1].guid);
    expect(footer.canContinue()).toBe(false);
    expect(h.navigateByUrl).not.toHaveBeenCalled();

    await h.table.save('skip');
    expect(footer.canContinue()).toBe(true);
    await footer.continue();
    expect(beforeNavigate).toHaveBeenCalledTimes(2);
    expect(h.selectFacility).toHaveBeenCalledTimes(2);
    expect(h.store.selectedFacility().guid).toBe(h.facilities[2].guid);
    expect(h.navigateByUrl).not.toHaveBeenCalled();
  });

  it.each(['canceled', 'failed'] as const)('allows a later deliberate Continue after leaving was %s', async outcome => {
    const h = createHarness(false);
    h.router.url = '/data-evaluation/account/analysis/select-items';
    await h.table.save('skip');
    const footer = TestBed.runInInjectionContext(() => new AccountAnalysisFooterComponent());
    const failure = new Error('leave failed');
    const beforeNavigate = vi.fn().mockResolvedValue(true);
    if (outcome === 'canceled') beforeNavigate.mockResolvedValueOnce(false);
    else beforeNavigate.mockRejectedValueOnce(failure);
    footer.beforeNavigate = beforeNavigate;
    const first = footer.continue();
    const duplicateBack = footer.goBack();
    const duplicateReturn = footer.returnToDashboard();
    if (outcome === 'failed') await expect(first).rejects.toBe(failure);
    else await first;
    await Promise.all([duplicateBack, duplicateReturn]);
    expect(h.store.selectedFacility().guid).toBe(h.facilities[0].guid);
    expect(h.selectFacility).not.toHaveBeenCalled();
    expect(h.navigateByUrl).not.toHaveBeenCalled();
    expect(beforeNavigate).toHaveBeenCalledTimes(1);

    await footer.continue();
    expect(beforeNavigate).toHaveBeenCalledTimes(2);
    expect(h.selectFacility).toHaveBeenCalledExactlyOnceWith(h.facilities[1].guid);
  });

  it('holds the footer action until routing finishes before accepting another action', async () => {
    const h = createHarness(false);
    const footer = TestBed.runInInjectionContext(() => new AccountAnalysisFooterComponent());
    const beforeNavigate = vi.fn(async () => true);
    footer.beforeNavigate = beforeNavigate;
    const started = deferred();
    const completed = deferred();
    h.navigateByUrl.mockImplementationOnce(() => {
      started.resolve();
      return completed.promise.then(() => true);
    });
    const first = footer.continue();
    await started.promise;
    const duplicateBack = footer.goBack();
    const duplicateReturn = footer.returnToDashboard();
    expect(h.navigateByUrl).toHaveBeenCalledTimes(1);
    expect(beforeNavigate).toHaveBeenCalledTimes(1);
    completed.resolve();
    await Promise.all([first, duplicateBack, duplicateReturn]);
    expect(h.navigateByUrl).toHaveBeenCalledTimes(1);

    await footer.returnToDashboard();
    expect(beforeNavigate).toHaveBeenCalledTimes(2);
    expect(h.navigateByUrl).toHaveBeenNthCalledWith(2, '/data-evaluation/account/analysis/dashboard');
  });

});

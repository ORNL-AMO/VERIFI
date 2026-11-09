import '@angular/compiler';
import { CommonModule } from '@angular/common';
import { NgModule, Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, defer, of } from 'rxjs';
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
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { AccountAnalysisService } from './account-analysis.service';
import { AccountAnalysisSetupComponent } from './account-analysis-setup/account-analysis-setup.component';
import { SelectItemTableComponent } from './select-facility-analysis-items/select-item-table/select-item-table.component';

@Pipe({ name: 'invalidAnalysis', standalone: false })
export class SavingInvalidAnalysisPipe implements PipeTransform {
  transform(_value: string) { return { hasError: false, groupsHaveErrors: false }; }
}

@Pipe({ name: 'groupName', standalone: false })
export class SavingGroupNamePipe implements PipeTransform {
  transform(value: string) { return value; }
}

@Pipe({ name: 'yearDisplay', standalone: false })
export class SavingYearDisplayPipe implements PipeTransform {
  transform(value: number, _fiscalYear: unknown) { return value; }
}

@NgModule({
  declarations: [AccountAnalysisSetupComponent,
    SavingInvalidAnalysisPipe, SavingGroupNamePipe, SavingYearDisplayPipe],
  imports: [CommonModule, FormsModule, ReactiveFormsModule]
})
class AccountAnalysisSavingTestModule { }

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(complete => resolve = complete);
  return { promise, resolve };
}

function createHarness(delayFirstWrite = true) {
  const store = new AccountWorkspaceStore();
  const account = {
    id: 1, guid: 'account-a', name: 'Account A', energyUnit: 'MMBtu', volumeLiquidUnit: 'kgal', energyIsSource: false,
    sustainabilityQuestions: { energyReductionBaselineYear: 2020, waterReductionBaselineYear: 2020 }
  } as any;
  const facilities = ['a', 'b'].map((suffix, index) => ({
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
  TestBed.configureTestingModule({
    imports: [AccountAnalysisSavingTestModule],
    providers: [
      FormBuilder,
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: AccountWorkspaceService, useValue: workspaceService },
      { provide: WorkspaceCommandBoundary, useValue: boundary },
      { provide: AnalysisCommandHandler, useValue: handler },
      { provide: Router, useValue: { navigateByUrl } },
      { provide: LoadingService, useValue: { setLoadingMessage: vi.fn(), setLoadingStatus: vi.fn() } },
      { provide: AnalysisService, useValue: { accountAnalysisItem } },
      { provide: SharedDataService, useValue: { modalOpen: new BehaviorSubject(false) } },
      { provide: AccountStatusCheckService, useValue: { accountStatusCheck: new BehaviorSubject(undefined) } },
      { provide: CalanderizationService, useValue: { calanderizedMeters: new BehaviorSubject([]) } },
      { provide: ToastNotificationsService, useValue: { showToast: vi.fn() } },
      { provide: AccountAnalysisService, useValue: new AccountAnalysisService() }
    ]
  });
  const table = TestBed.runInInjectionContext(() => new SelectItemTableComponent());
  const setup = TestBed.runInInjectionContext(() => new AccountAnalysisSetupComponent());
  TestBed.flushEffects();
  return {
    store, table, setup, analysis, otherAnalysis, facilities, models, storedAnalyses, storedModels,
    firstWriteStarted, releaseFirstWrite, updateWithObservable, addWithObservable,
    selectAccountAnalysis, accountAnalysisItem, navigateByUrl, boundary
  };
}

describe('Account analysis queued edits', () => {
  afterEach(() => TestBed.resetTestingModule());

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

  it.each(['accountAnalyses', 'facilities'] as const)('rejects a queued assignment when its %s owner disappears', async collection => {
    const h = createHarness(false);
    const blocked = deferred();
    const blocker = h.boundary.execute(
      { entityKind: 'account', changeKind: 'update', label: 'Earlier command', publication: { mode: 'patch', buildPatch: () => ({ collections: [] }) } },
      () => blocked.promise
    );
    const assignment = h.table.save(h.models[0].guid);
    const rejected = expect(assignment).rejects.toMatchObject({ code: 'validation-failed' });
    h.store.publishCommittedPatch(deleteWorkspaceRecords(collection, {
      guids: [collection === 'accountAnalyses' ? h.analysis.guid : h.facilities[0].guid]
    }));
    blocked.resolve();
    await blocker;
    await rejected;

    expect(h.updateWithObservable).not.toHaveBeenCalled();
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
    const rejected = expect(creation).rejects.toMatchObject({ code: 'validation-failed' });
    h.store.publishCommittedPatch(deleteWorkspaceRecords(collection, {
      guids: [collection === 'accountAnalyses' ? h.analysis.guid : h.facilities[0].guid]
    }));
    blocked.resolve();
    await blocker;
    await rejected;

    expect(h.addWithObservable).not.toHaveBeenCalled();
    expect(h.updateWithObservable).not.toHaveBeenCalled();
  });
});

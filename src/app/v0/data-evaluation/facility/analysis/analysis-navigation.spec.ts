import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, DestroyRef, inject, InjectionToken, NgModule, Pipe, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { GuardsCheckStart, provideRouter, Router, RouterModule } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BehaviorSubject, filter, firstValueFrom, take } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { RegressionModelStateService } from '@data/account-workspace/regression-model-state.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AnalysisGroup } from '@data/models/analysis';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { RouterGuardService } from '@shared/shared-router-guard-modal/router-guard-service';
import { canDeactivateGuard } from '@v0/routing/can-deactivate.guard';
import { AnalysisComponent } from './analysis.component';
import { AnalysisFooterComponent } from './analysis-footer/analysis-footer.component';
import { DataEvaluationService } from '@v0/data-evaluation/data-evaluation.service';
import { AnalysisBannerComponent } from './analysis-banner/analysis-banner.component';
import { AnalysisService } from './analysis.service';
import { RunAnalysisComponent } from './run-analysis/run-analysis.component';
import { GroupAnalysisComponent } from './run-analysis/group-analysis/group-analysis.component';
import { AnalysisAutosave } from './run-analysis/analysis-autosave';

const saveDraft = new InjectionToken<(value: { amount: number }) => Promise<void>>('analysis navigation test save');

@Component({ selector: 'app-navigation-test-editor', standalone: false, template: '<input aria-label="Model constant">' })
export class NavigationTestEditor {
  private readonly guard = inject(RouterGuardService);
  readonly autosave = new AnalysisAutosave<{ amount: number }>(inject(saveDraft));
  constructor() {
    this.autosave.hydrate({ amount: 10 }, true);
    inject(DestroyRef).onDestroy(() => this.autosave.destroy());
  }
  edit(amount: number, valid = true) { return this.autosave.capture({ amount }, valid); }
  canDeactivate(): Promise<boolean> { return this.autosave.canDeactivate(this.guard, () => undefined); }
}

@Pipe({ name: 'groupName', standalone: false })
export class NavigationGroupNamePipe { transform(value: string) { return value; } }

@NgModule({
  declarations: [AnalysisComponent, AnalysisBannerComponent, AnalysisFooterComponent, RunAnalysisComponent, GroupAnalysisComponent,
    NavigationTestEditor, NavigationGroupNamePipe],
  imports: [CommonModule, RouterModule], schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
class AnalysisNavigationTestModule { }

function deferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>(finish => { resolve = finish; });
  return { promise, resolve: (value: T) => resolve(value) };
}

const prefix = '/data-evaluation/facility/facility-a/analysis/run-analysis/';
const groupUrl = (guid: string) => prefix + 'group-analysis/' + guid + '/model-selection';

describe('facility analysis save-before-navigation', () => {
  let harness: RouterTestingHarness;
  let router: Router;
  let guard: RouterGuardService;
  let editor: NavigationTestEditor;
  let banner: AnalysisBannerComponent;
  let footer: AnalysisFooterComponent;
  let account: ReturnType<typeof signal<{ guid: string }>>;
  let selectedAnalysis: ReturnType<typeof signal<IdbAnalysisItem>>;
  let secondAnalysis: IdbAnalysisItem;
  let selectAnalysis: ReturnType<typeof vi.fn>;
  let persist: ReturnType<typeof vi.fn<(value: { amount: number }) => Promise<void>>>;

  beforeEach(async () => {
    const groups = ['group-a', 'group-b'].map(idbGroupId => ({
      idbGroupId, analysisType: 'regression', predictorVariables: [], isGeneratedModel: false
    } as AnalysisGroup));
    const firstAnalysis = { guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', analysisCategory: 'energy', groups } as IdbAnalysisItem;
    secondAnalysis = { ...firstAnalysis, guid: 'analysis-b' };
    account = signal({ guid: 'account-a' });
    selectedAnalysis = signal(firstAnalysis);
    selectAnalysis = vi.fn(guid => selectedAnalysis.set(guid === secondAnalysis.guid ? secondAnalysis : firstAnalysis));
    persist = vi.fn(async (_value: { amount: number }) => undefined);
    const selectedGroup = new BehaviorSubject(groups[0]);
    await TestBed.configureTestingModule({ imports: [AnalysisNavigationTestModule], providers: [
      provideRouter([{
        path: 'data-evaluation/facility/:facilityId/analysis', component: AnalysisComponent, children: [{
          path: 'run-analysis', component: RunAnalysisComponent, children: [{
            path: 'group-analysis/:id', component: GroupAnalysisComponent,
            children: [{ path: 'model-selection', component: NavigationTestEditor, canDeactivate: [canDeactivateGuard] },
              { path: 'annual-analysis', component: NavigationTestEditor, canDeactivate: [canDeactivateGuard] }]
          }, { path: 'analysis-setup', component: NavigationTestEditor, canDeactivate: [canDeactivateGuard] }]
        }]
      }]),
      { provide: saveDraft, useValue: (value: { amount: number }) => persist(value) },
      { provide: AccountWorkspaceStore, useValue: {
        account, selectedFacility: signal({ guid: 'facility-a', id: 1 }), selectedFacilityAnalysis: selectedAnalysis,
        selectedFacilityAnalyses: signal([firstAnalysis, secondAnalysis]), accountAnalyses: signal([]), facilityMeterData: signal([{}]), facilityMeterGroups: signal([{}])
      } },
      { provide: AccountWorkspaceService, useValue: { selectFacilityAnalysis: selectAnalysis } },
      { provide: AccountWorkspaceQueryService, useValue: { getMeterGroupName: (id: string) => id, getFacilityAnalysisByGuid: () => undefined } },
      { provide: AnalysisService, useValue: {
        selectedGroup, accountAnalysisItem: new BehaviorSubject(undefined), hideInUseMessage: new BehaviorSubject(false),
        getDisplaySubject: () => new BehaviorSubject('table')
      } },
      { provide: DataEvaluationService, useValue: { helpWidthBs: new BehaviorSubject(0), sidebarWidthBs: new BehaviorSubject(0) } },
      { provide: SharedDataService, useValue: { modalOpen: new BehaviorSubject(false) } },
      { provide: AccountStatusCheckService, useValue: {
        selectedFacilityStatusCheck$: new BehaviorSubject(undefined), calendarizationState: new BehaviorSubject({ status: 'idle' }), retryCalendarization: vi.fn()
      } },
      { provide: RegressionModelStateService, useValue: { clear: vi.fn() } }
    ] }).compileComponents();
    harness = await RouterTestingHarness.create(groupUrl('group-a'));
    harness.detectChanges();
    router = TestBed.inject(Router);
    guard = TestBed.inject(RouterGuardService);
    editor = harness.routeDebugElement.query(By.directive(NavigationTestEditor)).componentInstance;
    banner = harness.routeDebugElement.query(By.directive(AnalysisBannerComponent)).componentInstance;
    footer = harness.routeDebugElement.query(By.directive(AnalysisFooterComponent)).componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('waits for a valid pending draft before changing only the group route parameter', async () => {
    const started = deferred<void>();
    const saving = deferred<void>();
    persist.mockImplementationOnce(() => { started.resolve(); return saving.promise; });
    await editor.edit(12);
    const navigating = router.navigateByUrl(groupUrl('group-b'));
    await started.promise;
    expect(router.url).toBe(groupUrl('group-a'));
    expect(persist).toHaveBeenCalledExactlyOnceWith({ amount: 12 });
    saving.resolve();
    expect(await navigating).toBe(true);
    expect(router.url).toBe(groupUrl('group-b'));
  });

  it('preserves the original group when the user cancels an invalid draft exit', async () => {
    await editor.edit(null, false);
    const shown = firstValueFrom(guard.showModal.pipe(filter(Boolean), take(1)));
    const navigating = router.navigateByUrl(groupUrl('group-b'));
    await shown;
    expect(guard.showSave.value).toBe(false);
    guard.setModalAction('cancel');
    expect(await navigating).toBe(false);
    expect(router.url).toBe(groupUrl('group-a'));
    expect(TestBed.inject(AnalysisService).selectedGroup.value.idbGroupId).toBe('group-a');
    expect(persist).not.toHaveBeenCalled();
  });

  it('keeps the original analysis when its banner switch is canceled through all three hosts', async () => {
    await editor.edit(null, false);
    const shown = firstValueFrom(guard.showModal.pipe(filter(Boolean), take(1)));
    const switching = banner.selectItem(secondAnalysis);
    await shown;
    guard.setModalAction('cancel');
    await switching;
    expect(selectAnalysis).not.toHaveBeenCalled();
    expect(selectedAnalysis().guid).toBe('analysis-a');
    expect(router.url).toBe(groupUrl('group-a'));
  });

  it('ignores a banner completion if the active account changed while saving', async () => {
    const started = deferred<void>();
    const saving = deferred<void>();
    persist.mockImplementationOnce(() => { started.resolve(); return saving.promise; });
    await editor.edit(12);
    const switching = banner.selectItem(secondAnalysis);
    await started.promise;
    account.set({ guid: 'account-b' });
    saving.resolve();
    await switching;
    expect(selectAnalysis).not.toHaveBeenCalled();
    expect(router.url).toBe(groupUrl('group-a'));
  });
  it('flushes a pending model edit before the footer continues to results', async () => {
    const started = deferred<void>();
    const saving = deferred<void>();
    persist.mockImplementationOnce(() => { started.resolve(); return saving.promise; });
    await editor.edit(12);
    const navigating = footer.continue();
    await started.promise;
    expect(router.url).toBe(groupUrl('group-a'));
    saving.resolve();
    await navigating;
    expect(router.url).toBe(prefix + 'group-analysis/group-a/annual-analysis');
    expect(persist).toHaveBeenCalledExactlyOnceWith({ amount: 12 });
  });

  it('keeps the footer destination unchanged when the user cancels leaving', async () => {
    await editor.edit(null, false);
    const shown = firstValueFrom(guard.showModal.pipe(filter(Boolean), take(1)));
    const navigating = footer.returnToDashboard();
    await shown;
    guard.setModalAction('cancel');
    await navigating;
    expect(router.url).toBe(groupUrl('group-a'));
    expect(persist).not.toHaveBeenCalled();
  });


  it.each(['banner', 'footer'] as const)('keeps a newer route when an older %s action finishes saving', async kind => {
    const started = deferred<void>();
    const saving = deferred<void>();
    persist.mockImplementationOnce(() => { started.resolve(); return saving.promise; });
    await editor.edit(12);
    const older = kind === 'banner' ? banner.selectItem(secondAnalysis) : footer.continue();
    await started.promise;
    const checking = firstValueFrom(router.events.pipe(filter(event => event instanceof GuardsCheckStart), take(1)));
    const newer = router.navigateByUrl(groupUrl('group-b'));
    await checking;
    saving.resolve();
    await Promise.all([older, newer]);
    expect(router.url).toBe(groupUrl('group-b'));
    expect(selectAnalysis).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledExactlyOnceWith({ amount: 12 });
  });

});

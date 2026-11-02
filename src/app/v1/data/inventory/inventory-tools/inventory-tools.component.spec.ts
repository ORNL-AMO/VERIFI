import { Component, computed, inject, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { reportSnapshot } from '@app/v1/reports/facility/testing/report-test-fixtures';
import { meter } from '@app/v1/data/meters/facility-meters.testing';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { InventoryToolsComponent } from './inventory-tools.component';
import { of } from 'rxjs';
import { InventorySelectionController } from '../selection/inventory-selection.controller';
import { InventoryChartController } from '../charts/inventory-chart.controller';
import { InventoryResource, InventoryToolsSource } from '../inventory-tools.models';

@Component({ standalone: true, imports: [InventoryToolsComponent],
  template: '@if (toolsVisible()) { <app-inventory-tools [selection]="selection" [chart]="chart" [showSelectionToggle]="showSelectionToggle()"/> }' })
class ToolsTestHost {
  private readonly store = inject(AccountWorkspaceStore);
  private readonly navigation = inject(WorkspaceNavigationService);
  readonly resource = signal<InventoryResource>('meters');
  readonly matchingGuids = signal<readonly string[]>(['ma']);
  readonly scopeGuids = signal<readonly string[]>(['ma', 'mb']);
  readonly filtersKey = signal('');
  readonly showSelectionToggle = signal(true);
  readonly toolsVisible = signal(true);
  readonly source: InventoryToolsSource = {
    context: computed(() => ({ accountGuid: this.store.account()?.guid, facilityGuid: this.navigation.inventoryFacilityGuid(), resource: this.resource() })),
    matchingGuids: this.matchingGuids, scopeGuids: this.scopeGuids, filtersKey: this.filtersKey
  };
  readonly selection = new InventorySelectionController(this.source);
  readonly chart = new InventoryChartController(this.source);
}

function setup() {
  const store = new AccountWorkspaceStore(), snapshot = reportSnapshot(), scope = signal<string | undefined>(undefined);
  store.publish({ ...snapshot, facilities: [snapshot.facilities[0], { ...snapshot.facilities[0], guid: 'facility-b', name: 'Other' }],
    meters: [meter({ guid:'ma', accountId: snapshot.account.guid, facilityId: snapshot.facilities[0].guid }), meter({ guid:'mb', accountId: snapshot.account.guid, facilityId:'facility-b' })] });
  const remove = vi.fn(async (_changes: readonly unknown[], _accountGuid: string) => 2);
  TestBed.configureTestingModule({ imports: [ToolsTestHost], providers: [provideRouter([]),
    { provide: AccountWorkspaceStore, useValue: store }, { provide: WorkspaceNavigationService, useValue: { inventoryFacilityGuid: scope } },
    { provide: MeterCommandHandler, useValue: { deleteMetersAcrossFacilities: remove } },
    { provide: WorkspaceCommandBoundary, useValue: { execute: vi.fn(async (_options, persist) => ({ value: await persist() })) } },
    { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of({ state:'ready', meters:[] }), project: () => ({state:'ready', meters:[]}) } }
  ] });
  const fixture = TestBed.createComponent(ToolsTestHost); fixture.detectChanges();
  const host = fixture.componentInstance;
  const tools = fixture.debugElement.query(By.directive(InventoryToolsComponent)).componentInstance as InventoryToolsComponent;
  return { fixture, host, tools, selection: host.selection, chart: host.chart, scope, store, remove };
}

function deferredDeletion() {
  let resolve!: (count: number) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<number>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

describe('unified inventory tools', () => {
  it('keeps charts open across scopes, resets selection, and restores chart preferences independently', () => {
    const { fixture, tools, scope, selection, chart, host } = setup();
    chart.form.controls.grouping.setValue('meters'); chart.view.set({ ...chart.view(), tracePanelOpen: false, collapsedTraceFacilities: ['facility-a'] }); tools.openCharts(); selection.select({guid:'ma',selected:true}); fixture.detectChanges();
    expect(host.matchingGuids()).toEqual(['ma']);
    scope.set('facility-b'); fixture.detectChanges();
    expect(chart.open()).toBe(true); expect(chart.grouping()).toBe('groups'); expect(selection.selected()).toEqual([]);
    scope.set(undefined); fixture.detectChanges(); expect(chart.grouping()).toBe('meters');
    expect(chart.view().tracePanelOpen).toBe(false); expect(chart.view().collapsedTraceFacilities).toEqual(['facility-a']);
  });
  it('selects all matching across pages and resets selection when filters change', () => {
    const { fixture, host, selection } = setup(); selection.selectAll(); expect(selection.selected()).toEqual(['ma']);
    expect(host.matchingGuids()).toEqual(['ma']);
    host.matchingGuids.set(['mb']); fixture.detectChanges(); expect(host.matchingGuids()).toEqual(['mb']);
    host.filtersKey.set('changed'); fixture.detectChanges(); expect(selection.selected()).toEqual([]);
  });
  it('supports a header-owned toggle without changing the matching meter chart source', () => {
    const { fixture, host, selection } = setup();
    host.showSelectionToggle.set(false); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.inventory-tools')).toBeNull();
    selection.toggleSelection(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#meters-selection-actions')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Select meters');
    const selectAll = [...fixture.nativeElement.querySelectorAll('button')].find((button: HTMLButtonElement) => button.textContent.trim() === 'Select all') as HTMLButtonElement;
    selectAll.click(); fixture.detectChanges();
    expect(selection.selected()).toEqual(['ma']);
    selection.toggleSelection(); fixture.detectChanges();
    expect(selection.selecting()).toBe(false); expect(selection.selected()).toEqual([]);

    expect(fixture.nativeElement.querySelector('#meters-selection-actions')).toBeNull();
  });
  it('retains route-owned selection and chart preferences when its tools view is recreated', () => {
    const { fixture, host, tools, selection, chart } = setup();
    selection.toggleSelection(); selection.select({ guid: 'ma', selected: true });
    chart.form.controls.grouping.setValue('meters'); chart.zoom.set({ start: 20, end: 60 });
    tools.openCharts(); fixture.detectChanges();
    host.toolsVisible.set(false); fixture.detectChanges();
    expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
    expect(chart.open()).toBe(false);
    expect(selection.selected()).toEqual(['ma']); expect(selection.selecting()).toBe(true);
    host.toolsVisible.set(true); fixture.detectChanges();
    const replacement = fixture.debugElement.query(By.directive(InventoryToolsComponent)).componentInstance as InventoryToolsComponent;
    expect(replacement.selection()).toBe(selection); expect(replacement.chart()).toBe(chart);
    expect(chart.grouping()).toBe('meters'); expect(chart.zoom()).toEqual({ start: 20, end: 60 });
    replacement.openCharts(); fixture.detectChanges(); expect(chart.open()).toBe(true);
  });
  it.each(['success', 'failure'] as const)('releases the route-owned save after tools removal and deletion %s without publishing abandoned review UI', async outcome => {
    const { fixture, host, tools, remove, selection } = setup(), deletion = deferredDeletion();
    remove.mockReturnValueOnce(deletion.promise);
    selection.select({ guid: 'ma', selected: true }); tools.requestDelete(); fixture.detectChanges();
    const pending = tools.confirmDelete();
    host.toolsVisible.set(false); fixture.detectChanges();
    expect(selection.review()).toBeUndefined(); expect(selection.saving()).toBe(true);
    expect(TestBed.inject(UnsavedChangesService).confirmDiscard()).toBe(false);
    if (outcome === 'success') deletion.resolve(1); else deletion.reject(new Error('Abandoned review failed'));
    await pending; fixture.detectChanges();
    expect(remove).toHaveBeenCalledOnce(); expect(selection.saving()).toBe(false);
    expect(selection.selected()).toEqual(['ma']); expect(selection.error()).toBe('');
    expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
    expect(TestBed.inject(UnsavedChangesService).confirmDiscard()).toBe(true);
  });
  it('charts matching Predictors and restores multiple mode independently by facility', () => {
    const { fixture, store, scope, host, selection, chart } = setup();
    const saved = store.snapshot()!;
    store.publish({ ...saved, predictors: ['pa', 'pb'].map(guid => ({ ...getNewIdbPredictor(saved.account.guid, saved.facilities[0].guid), guid })) });
    host.resource.set('predictors'); host.matchingGuids.set(['pa']); host.scopeGuids.set(['pa', 'pb']); fixture.detectChanges();
    expect(host.matchingGuids()).toEqual(['pa']); expect(chart.multiplePredictors()).toBe(false);
    chart.form.controls.multiplePredictors.setValue(true); fixture.detectChanges();
    selection.select({ guid: 'pb', selected: true }); expect(host.matchingGuids()).toEqual(['pa']);
    scope.set('facility-b'); fixture.detectChanges(); expect(chart.multiplePredictors()).toBe(false);
    scope.set(undefined); fixture.detectChanges(); expect(chart.multiplePredictors()).toBe(true);
    selection.clearSelection(); expect(host.matchingGuids()).toEqual(['pa']);
  });
  it('ignores selection toggles during a pending save or with no matching items', () => {
    const { fixture, host, selection, store: workspaceStore } = setup();
    workspaceStore.setPending({ id: 1, label: 'Saving' }); selection.toggleSelection(); expect(selection.selecting()).toBe(false);
    workspaceStore.clearPending(1);
    host.matchingGuids.set([]); fixture.detectChanges();
    selection.toggleSelection(); expect(selection.selecting()).toBe(false);
  });
  it('reviews a cross-facility selection and blocks leaving before one command commits', async () => {
    const { fixture, tools, remove, selection } = setup(); selection.select({guid:'ma',selected:true});selection.select({guid:'mb',selected:true});tools.requestDelete();fixture.detectChanges();
    expect(selection.reviewGroups()).toHaveLength(2);expect(TestBed.inject(UnsavedChangesService).confirmDiscard()).toBe(false);
    await tools.confirmDelete(); expect(TestBed.inject(WorkspaceCommandBoundary).execute).toHaveBeenCalledOnce(); expect(remove).toHaveBeenCalledOnce();expect(remove.mock.calls[0][0]).toHaveLength(2);expect(selection.selected()).toEqual([]);
  });
  it('rejects a changed deletion preview without writing', async () => {
    const { fixture, tools, store, remove, selection }=setup();selection.select({guid:'ma',selected:true});tools.requestDelete();
    store.publish({ ...store.snapshot()!, meters: store.meters().map((m,index) => index ? m : {...m,name:'Changed'}) });fixture.detectChanges();
    await tools.confirmDelete();expect(remove).not.toHaveBeenCalled();expect(selection.error()).toContain('changed');
  });
  it.each(['success', 'failure'] as const)('suppresses late deletion %s after forced destruction without cancelling persistence', async outcome => {
    const { fixture, tools, remove, selection } = setup(), deletion = deferredDeletion();
    remove.mockReturnValueOnce(deletion.promise);
    selection.select({ guid: 'ma', selected: true }); tools.requestDelete(); fixture.detectChanges();
    const pending = tools.confirmDelete();
    expect(remove).toHaveBeenCalledOnce();
    expect(selection.saving()).toBe(true);
    fixture.destroy();
    const hide = vi.spyOn(TestBed.inject(ModalPortalService), 'hide');

    if (outcome === 'success') deletion.resolve(1); else deletion.reject(new Error('Old deletion failed'));
    await pending;

    expect(remove).toHaveBeenCalledOnce();
    expect(selection.review()).toBeUndefined();
    expect(selection.selected()).toEqual(['ma']);
    expect(selection.error()).toBe('');
    expect(selection.saving()).toBe(true);
    expect(hide).not.toHaveBeenCalled();
  });
  it.each(['success', 'failure'] as const)('keeps the next context deletion intact when an old deletion finishes with %s', async outcome => {
    const { fixture, tools, remove, scope, host, selection } = setup();
    const oldDeletion = deferredDeletion(), currentDeletion = deferredDeletion();
    remove.mockReturnValueOnce(oldDeletion.promise).mockReturnValueOnce(currentDeletion.promise);
    selection.select({ guid: 'ma', selected: true }); tools.requestDelete(); fixture.detectChanges();
    const oldPending = tools.confirmDelete();

    scope.set('facility-b');
    host.matchingGuids.set(['mb']); host.scopeGuids.set(['mb']); fixture.detectChanges();
    expect(selection.saving()).toBe(false); expect(selection.review()).toBeUndefined(); expect(selection.error()).toBe('');
    selection.select({ guid: 'mb', selected: true }); tools.requestDelete(); fixture.detectChanges();
    const reviewed = selection.review(), currentPending = tools.confirmDelete();
    const portal = TestBed.inject(ModalPortalService), currentPortal = portal.activePortal(), hide = vi.spyOn(portal, 'hide');

    if (outcome === 'success') oldDeletion.resolve(1); else oldDeletion.reject(new Error('Old deletion failed'));
    await oldPending; fixture.detectChanges();

    expect(remove).toHaveBeenCalledTimes(2);
    expect(selection.review()).toBe(reviewed); expect(selection.selected()).toEqual(['mb']);
    expect(selection.saving()).toBe(true); expect(selection.error()).toBe('');
    expect(portal.activePortal()).toBe(currentPortal); expect(hide).not.toHaveBeenCalled();

    currentDeletion.resolve(1); await currentPending; fixture.detectChanges();
    expect(selection.review()).toBeUndefined(); expect(selection.selected()).toEqual([]); expect(selection.saving()).toBe(false);
    fixture.destroy();
  });
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { reportSnapshot } from '@app/v1/facility/reports/testing/report-test-fixtures';
import { meter } from '@app/v1/data/meters/facility-meters.testing';
import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { InventoryToolsComponent } from './inventory-tools.component';
import { of } from 'rxjs';

function setup() {
  const store = new AccountWorkspaceStore(), snapshot = reportSnapshot(), scope = signal<string | undefined>(undefined);
  store.publish({ ...snapshot, facilities: [snapshot.facilities[0], { ...snapshot.facilities[0], guid: 'facility-b', name: 'Other' }],
    meters: [meter({ guid:'ma', accountId: snapshot.account.guid, facilityId: snapshot.facilities[0].guid }), meter({ guid:'mb', accountId: snapshot.account.guid, facilityId:'facility-b' })] });
  const remove = vi.fn(async (_changes: readonly unknown[], _accountGuid: string) => 2);
  TestBed.configureTestingModule({ imports: [InventoryToolsComponent], providers: [provideRouter([]),
    { provide: AccountWorkspaceStore, useValue: store }, { provide: WorkspaceNavigationService, useValue: { inventoryFacilityGuid: scope } },
    { provide: MeterCommandHandler, useValue: { deleteMetersAcrossFacilities: remove } },
    { provide: WorkspaceCommandBoundary, useValue: { execute: vi.fn(async (_options, persist) => ({ value: await persist() })) } },
    { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of({ state:'ready', meters:[] }), project: () => ({state:'ready', meters:[]}) } }
  ] });
  const fixture = TestBed.createComponent(InventoryToolsComponent);
  fixture.componentRef.setInput('resource','meters'); fixture.componentRef.setInput('matchingGuids',['ma']); fixture.componentRef.setInput('scopeGuids',['ma','mb']); fixture.detectChanges();
  return { fixture, tools: fixture.componentInstance, scope, store, remove };
}
describe('unified inventory tools', () => {
  it('keeps charts open across scopes, resets selection, and restores chart preferences independently', () => {
    const {fixture,tools,scope} = setup();
    tools.form.controls.grouping.setValue('meters'); tools.view.set({ ...tools.view(), tracePanelOpen: false, collapsedTraceFacilities: ['facility-a'] }); tools.openCharts(); tools.select({guid:'ma',selected:true}); fixture.detectChanges();
    expect(tools.sourceIds()).toEqual(['ma']);
    scope.set('facility-b'); fixture.detectChanges();
    expect(tools.chartsOpen()).toBe(true); expect(tools.grouping()).toBe('groups'); expect(tools.selected()).toEqual([]);
    scope.set(undefined); fixture.detectChanges(); expect(tools.grouping()).toBe('meters');
    expect(tools.view().tracePanelOpen).toBe(false); expect(tools.view().collapsedTraceFacilities).toEqual(['facility-a']);
  });
  it('selects all matching across pages and resets selection when filters change', () => {
    const {fixture,tools} = setup(); tools.selectAll(); expect(tools.selected()).toEqual(['ma']);
    expect(tools.sourceIds()).toEqual(['ma']);
    fixture.componentRef.setInput('matchingGuids', ['mb']); fixture.detectChanges(); expect(tools.sourceIds()).toEqual(['mb']);
    fixture.componentRef.setInput('filtersKey','changed'); fixture.detectChanges(); expect(tools.selected()).toEqual([]);
  });
  it('supports a header-owned toggle without changing the matching meter chart source', () => {
    const { fixture, tools } = setup();
    fixture.componentRef.setInput('showSelectionToggle', false); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.inventory-tools')).toBeNull();
    tools.toggleSelection(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#meters-selection-actions')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Select meters');
    const selectAll = [...fixture.nativeElement.querySelectorAll('button')].find((button: HTMLButtonElement) => button.textContent.trim() === 'Select all') as HTMLButtonElement;
    selectAll.click(); fixture.detectChanges();
    expect(tools.selected()).toEqual(['ma']);
    tools.toggleSelection(); fixture.detectChanges();
    expect(tools.selecting()).toBe(false); expect(tools.selected()).toEqual([]);

    expect(fixture.nativeElement.querySelector('#meters-selection-actions')).toBeNull();
  });
  it('charts matching Predictors and restores multiple mode independently by facility', () => {
    const { fixture, tools, store, scope } = setup();
    const saved = store.snapshot()!;
    store.publish({ ...saved, predictors: ['pa', 'pb'].map(guid => ({ ...getNewIdbPredictor(saved.account.guid, saved.facilities[0].guid), guid })) });
    fixture.componentRef.setInput('resource', 'predictors'); fixture.componentRef.setInput('matchingGuids', ['pa']); fixture.componentRef.setInput('scopeGuids', ['pa', 'pb']); fixture.detectChanges();
    expect(tools.sourceIds()).toEqual(['pa']); expect(tools.multiplePredictors()).toBe(false);
    tools.form.controls.multiplePredictors.setValue(true); fixture.detectChanges();
    tools.select({ guid: 'pb', selected: true }); expect(tools.sourceIds()).toEqual(['pa']);
    scope.set('facility-b'); fixture.detectChanges(); expect(tools.multiplePredictors()).toBe(false);
    scope.set(undefined); fixture.detectChanges(); expect(tools.multiplePredictors()).toBe(true);
    tools.clearSelection(); expect(tools.sourceIds()).toEqual(['pa']);
  });
  it('ignores selection toggles during a pending save or with no matching items', () => {
    const { fixture, tools } = setup();
    tools.saving.set(true); tools.toggleSelection(); expect(tools.selecting()).toBe(false);
    tools.saving.set(false);
    fixture.componentRef.setInput('matchingGuids', []); fixture.detectChanges();
    tools.toggleSelection(); expect(tools.selecting()).toBe(false);
  });
  it('reviews a cross-facility selection and blocks leaving before one command commits', async () => {
    const {fixture,tools,remove} = setup(); tools.select({guid:'ma',selected:true});tools.select({guid:'mb',selected:true});tools.requestDelete();fixture.detectChanges();
    expect(tools.reviewGroups()).toHaveLength(2);expect(TestBed.inject(UnsavedChangesService).confirmDiscard()).toBe(false);
    await tools.confirmDelete(); expect(TestBed.inject(WorkspaceCommandBoundary).execute).toHaveBeenCalledOnce(); expect(remove).toHaveBeenCalledOnce();expect(remove.mock.calls[0][0]).toHaveLength(2);expect(tools.selected()).toEqual([]);
  });
  it('rejects a changed deletion preview without writing', async () => {
    const {fixture,tools,store,remove}=setup();tools.select({guid:'ma',selected:true});tools.requestDelete();
    store.publish({ ...store.snapshot()!, meters: store.meters().map((m,index) => index ? m : {...m,name:'Changed'}) });fixture.detectChanges();
    await tools.confirmDelete();expect(remove).not.toHaveBeenCalled();expect(tools.error()).toContain('changed');
  });
});

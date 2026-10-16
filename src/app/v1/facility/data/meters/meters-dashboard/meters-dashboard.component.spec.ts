import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { account, facility, group, meter, reading, calendarizedMeter, monthlyData } from '../facility-meters.testing';
import { buildMeterCards } from '../models';
import { FacilityMetersWorkspaceService } from '../facility-meters-workspace.service';
import { MetersDashboardActionsService } from './meters-dashboard-actions.service';
import { MetersDashboardComponent } from './meters-dashboard.component';
import { MonthlyTrendsComponent } from './monthly-trends/monthly-trends.component';
import { MeterDirectoryComponent } from './meter-directory/meter-directory.component';

@Component({ selector: 'app-monthly-trends', standalone: true, template: '' })
class TrendsStub {
  charts = input<any[]>([]); state = input('ready'); zoomRange = input<any>(); emphasized = input<string>(); zoomChanged = output<any>();
}

function setup() {
  const meters = signal([meter({ guid: 'a', name: 'Alpha', groupId: 'g' }), meter({ guid: 'b', name: 'Beta', source: 'Water Intake' })]);
  const data = signal([reading({ guid: 'r1', meterId: 'a', month: 1, id: 11 }), reading({ guid: 'r2', meterId: 'b', month: 3, id: 12 })]);
  const currentFacility = signal(facility());
  const canWrite = signal(true), hasPending = signal(false);
  const statusState = signal<any>('ready');
  const calendarized = signal(meters().map(item => calendarizedMeter(item, [monthlyData({ energyCost: 10 })], { showEnergyUse: item.source === 'Electricity' })));
  const cards = signal(buildMeterCards(meters(), data(), [group({ guid: 'g', name: 'Purchased Electricity' })]));
  const workspace = { account: signal(account()), facility: currentFacility, meterData: data, meterGroups: signal([]), meterCards: cards,
    facilityCalendarizedMeters: calendarized, statusState, calendarizationState: signal<any>('ready'), canWrite, hasPending };
  const actions = { createMeter: vi.fn().mockResolvedValue(meter({ guid: 'created' })), copyMeter: vi.fn().mockResolvedValue(meter({ guid: 'copy' })), deleteMeters: vi.fn().mockResolvedValue(undefined) };
  const portal = { show: vi.fn(), hide: vi.fn() };
  TestBed.configureTestingModule({ imports: [MetersDashboardComponent], providers: [provideRouter([]),
    { provide: FacilityMetersWorkspaceService, useValue: workspace }, { provide: ModalPortalService, useValue: portal },
    { provide: WorkspaceNavigationService, useValue: {
      accountDataReturnRoute: (guid: string) => ['/v1', 'workspace', 'account', guid, 'data', 'portfolio', 'facilities'],
      accountDataRoute: (guid: string) => ['/v1', 'workspace', 'account', guid, 'data', 'portfolio'],
      facilityMeterRoute: (guid: string, id: string, tab: string) => ['/v1', 'workspace', 'facility', guid, 'data', 'meters', id, tab]
    } }
  ] }).overrideComponent(MetersDashboardComponent, { remove: { imports: [MonthlyTrendsComponent] }, add: { imports: [TrendsStub] } });
  TestBed.overrideComponent(MetersDashboardComponent, { set: { providers: [{ provide: MetersDashboardActionsService, useValue: actions }] } });
  const fixture = TestBed.createComponent(MetersDashboardComponent);
  fixture.detectChanges();
  const component = fixture.componentInstance;
  return { fixture, component, workspace, cards, actions, portal, canWrite, hasPending, currentFacility, statusState, calendarized };
}

describe('compact facility meters dashboard', () => {
  it('restores facility browse controls and chart range after a meter visit without restoring deletion selection', () => {
    const { fixture, component, cards } = setup();
    cards.set(buildMeterCards(Array.from({ length: 20 }, (_, index) => meter({ guid: `m-${index}` })), [], [])); fixture.detectChanges();
    component.filtersForm.controls.sort.setValue('meterName'); fixture.detectChanges(); component.changePage(2); component.toggleListExpanded();
    component.zoomRange.set({ start: 20, end: 70 }); component.startSelection(); component.selectAll(); fixture.detectChanges(); fixture.destroy();
    const restored = TestBed.createComponent(MetersDashboardComponent); restored.detectChanges();
    expect(restored.componentInstance.sortBy()).toBe('meterName');
    expect(restored.componentInstance.currentPage()).toBe(2); expect(restored.componentInstance.listExpanded()).toBe(true);
    expect(restored.componentInstance.zoomRange()).toEqual({ start: 20, end: 70 });
    expect(restored.componentInstance.selecting()).toBe(false); expect(restored.componentInstance.selected()).toEqual([]);
  });

  it('shows compact names, source chips and status without detailed card facts', () => {
    const { fixture } = setup();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Account A'); expect(text).toContain('Facility A');
    expect(text).toContain('Showing 2 of 2 meters'); expect(text).toContain('Select meters');
    expect(text).not.toContain('First reading'); expect(text).not.toContain('Scope');
    expect(fixture.nativeElement.querySelectorAll('.meter-directory__open')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('app-meter-browse-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Meter list display"]')).toBeNull();
  });
  it('filters list and chart meters together by search and status, with a clear-filter empty state', () => {
    const { fixture, component } = setup();
    component.filtersForm.controls.search.setValue('water intake'); fixture.detectChanges();
    expect(component.filteredMeterCards().map(item => item.card.meter.guid)).toEqual(['b']);
    expect(component.chartViews().find(chart => chart.id === 'cost')!.metrics.map(item => item.id)).toEqual(['b']);
    component.filtersForm.controls.status.setValue('missingGroup'); fixture.detectChanges();
    expect(component.filteredMeterCards()).toHaveLength(1);
    component.filtersForm.controls.search.setValue('purchased electricity'); fixture.detectChanges();
    expect(component.filteredMeterCards()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('No meters match these filters');
    component.clearFilters(); fixture.detectChanges();
    expect(component.filteredMeterCards()).toHaveLength(2);
  });
  it('pages only the directory, keeps charts and bulk selection complete, and resets or clamps pages as inventory changes', () => {
    const { fixture, component, cards, calendarized } = setup();
    const meters = Array.from({ length: 25 }, (_, index) => meter({ guid: `m-${index}`, name: `Meter ${index.toString().padStart(2, '0')}` }));
    cards.set(buildMeterCards(meters, [], []));
    calendarized.set(meters.map(item => calendarizedMeter(item, [monthlyData({ energyCost: 10 })])));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.meter-directory__open')).toHaveLength(8);
    expect(component.chartViews().find(chart => chart.id === 'cost')!.metrics).toHaveLength(25);
    component.startSelection(); component.selectAll(); component.changePage(2); fixture.detectChanges();
    expect(component.visibleMeterCards()[0].card.meter.name).toBe('Meter 08');
    expect(component.selected()).toHaveLength(25);
    component.filtersForm.controls.sort.setValue('meterName'); fixture.detectChanges(); expect(component.currentPage()).toBe(1);
    expect(component.selected()).toHaveLength(25);
    component.changePage(3); component.filtersForm.controls.search.setValue('Meter 2'); fixture.detectChanges();
    expect(component.currentPage()).toBe(1); expect(component.visibleMeterCards()).toHaveLength(5);
    expect(component.selected()).toEqual([]);
    component.clearFilters(); fixture.detectChanges(); component.changePage(4); fixture.detectChanges();
    expect(component.visibleMeterCards()).toHaveLength(1);
    cards.set(cards().slice(0, 3)); fixture.detectChanges();
    expect(component.currentPage()).toBe(1); expect(component.visibleMeterCards()).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('[aria-label="Next meter page"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Meter list display"]')).toBeNull();
  });
  it('expands all matching meters in place of charts and restores paging, zoom, selection and keyboard focus', () => {
    const { fixture, component, cards, currentFacility } = setup();
    cards.set(buildMeterCards(Array.from({ length: 20 }, (_, index) => meter({ guid: `m-${index}` })), [], []));
    fixture.detectChanges(); component.changePage(2); component.startSelection(); component.selectAll();
    component.zoomRange.set({ start: 20, end: 80 }); component.toggleListExpanded(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.meter-directory__open')).toHaveLength(20);
    expect(fixture.nativeElement.querySelector('app-monthly-trends')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Next meter page"]')).toBeNull();
    expect(component.selected()).toHaveLength(20);
    component.toggleListExpanded(); fixture.detectChanges();
    expect(component.currentPage()).toBe(2); expect(component.visibleMeterCards()).toHaveLength(8);
    expect(component.zoomRange()).toEqual({ start: 20, end: 80 });
    expect(component.selected()).toHaveLength(20);
    expect(document.activeElement?.textContent).toContain('Expand list');
    component.toggleListExpanded(); cards.set(cards().slice(0, 3)); fixture.detectChanges();
    expect(component.pageCount()).toBe(1);
    expect(fixture.nativeElement.querySelector('[aria-label="Return to list and charts"]')).not.toBeNull();
    currentFacility.set(facility({ guid: 'other' })); fixture.detectChanges();
    expect(component.listExpanded()).toBe(false);
  });
  it('preserves all sort modes, and sorting keeps selection and chart styles', () => {
    const { fixture, component } = setup();
    component.startSelection(); component.selectAll();
    const colors = component.chartViews().find(chart => chart.id === 'cost')!.metrics.map(metric => metric.color);
    component.filtersForm.controls.sort.setValue('latestReading'); fixture.detectChanges();
    expect(component.filteredMeterCards().map(item => item.card.meter.guid)).toEqual(['b', 'a']);
    expect(component.selected()).toHaveLength(2);
    component.filtersForm.controls.sort.setValue('meterName'); fixture.detectChanges();
    expect(component.filteredMeterCards().map(item => item.card.meter.guid)).toEqual(['a', 'b']);
    expect(component.chartViews().find(chart => chart.id === 'cost')!.metrics.map(metric => metric.color)).toEqual(colors);
  });
  it('hides bulk checkboxes until select mode, filters clear selection and reset zoom, and facility switches exit mode', () => {
    const { fixture, component, currentFacility } = setup();
    expect(fixture.nativeElement.querySelector('input[type="checkbox"]')).toBeNull();
    component.startSelection(); component.selectAll(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
    component.zoomRange.set({ start: 20, end: 60 }); component.filtersForm.controls.search.setValue('Beta'); fixture.detectChanges();
    expect(component.selected()).toEqual([]); expect(component.zoomRange()).toEqual({ start: 0, end: 100 });
    component.selectAll(); currentFacility.set(facility({ guid: 'other' })); fixture.detectChanges();
    expect(component.selecting()).toBe(false); expect(component.selected()).toEqual([]);
  });
  it('prunes deleted meters from the selection on live inventory updates', () => {
    const { fixture, component, cards } = setup();
    component.startSelection(); component.selectAll(); cards.set(cards().slice(0, 1)); fixture.detectChanges();
    expect(component.selected()).toEqual(['a']);
  });
  it('preserves selection on cancel and failure, then deletes once and exits after success', async () => {
    const { fixture, component, actions, portal } = setup();
    component.startSelection(); component.selectAll(); component.requestDeleteSelected();
    expect(portal.show).toHaveBeenCalled(); expect(component.targetReadingCount()).toBe(2);
    component.closeConfirmation(); expect(component.selected()).toHaveLength(2);
    component.requestDeleteSelected(); actions.deleteMeters.mockRejectedValueOnce(new Error('Save failed'));
    await component.confirmAction(); expect(component.actionError()).toBe('Save failed'); expect(component.selected()).toHaveLength(2);
    await component.confirmAction(); fixture.detectChanges();
    expect(actions.deleteMeters).toHaveBeenLastCalledWith(expect.arrayContaining(['a', 'b']));
    expect(component.selected()).toEqual([]); expect(component.selecting()).toBe(false); expect(component.confirmationKind()).toBeUndefined();
  });
  it('updates confirmation names and reading counts, and dismisses a stale selection after inventory changes', () => {
    const { fixture, component, cards } = setup();
    component.startSelection(); component.selectAll(); component.requestDeleteSelected(); fixture.detectChanges();
    cards.update(current => current.map((card, index) => index ? card : {
      ...card, meter: { ...card.meter, name: 'Alpha updated' }, readingCount: 3
    })); fixture.detectChanges();
    expect(component.targetReadingCount()).toBe(4);
    expect(component.targets().find(card => card.meter.guid === 'a')?.meter.name).toBe('Alpha updated');
    cards.update(current => current.slice(1)); fixture.detectChanges();
    expect(component.confirmationKind()).toBeUndefined();
    expect(component.selected()).toEqual(['b']);
  });
  it('does not navigate after a copy finishes on a destroyed dashboard', async () => {
    const { fixture, component, actions } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    let finish!: (value: ReturnType<typeof meter>) => void;
    actions.copyMeter.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    component.handleAction({ guid: 'a', action: 'copy' });
    const pending = component.confirmAction(); fixture.destroy();
    finish(meter({ guid: 'copy' })); await pending;
    expect(navigate).not.toHaveBeenCalled();
  });
  it('keeps individual settings, readings, copy and delete actions', async () => {
    const { component, actions } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.handleAction({ guid: 'b', action: 'settings' });
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'facility', 'facility-a', 'data', 'meters', 'b', 'settings']);
    component.handleAction({ guid: 'a', action: 'readings' });
    expect(navigate).toHaveBeenLastCalledWith(['/v1', 'workspace', 'facility', 'facility-a', 'data', 'meters', 'a', 'readings']);
    component.handleAction({ guid: 'a', action: 'copy' }); await component.confirmAction(); expect(actions.copyMeter).toHaveBeenCalled();
    component.handleAction({ guid: 'b', action: 'delete' }); await component.confirmAction(); expect(actions.deleteMeters).toHaveBeenCalledWith(['b']);
  });
  it('uses the portal to create a meter and open its settings', async () => {
    const { component, actions, portal } = setup();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.openAddMeter(); expect(portal.show).toHaveBeenCalled();
    await component.saveMeterDraft({ name: 'New', source: 'Electricity' });
    expect(actions.createMeter).toHaveBeenCalledWith({ name: 'New', source: 'Electricity' }, 'facility-a');
    expect(component.addMeterOpen()).toBe(false);
  });
  it('keeps the list usable while chart checks are pending or unavailable and guards writes', () => {
    const { fixture, component, workspace, statusState, canWrite } = setup();
    statusState.set('error'); workspace.calendarizationState.set('error'); canWrite.set(false); fixture.detectChanges();
    expect(component.meterCards()[0].statusLabel).toBe('Checks unavailable');
    expect(fixture.nativeElement.querySelectorAll('.meter-directory__open')).toHaveLength(2);
    component.startSelection(); component.openAddMeter(); expect(component.selecting()).toBe(false); expect(component.addMeterOpen()).toBe(false);
    statusState.set('evaluating'); fixture.detectChanges(); expect(component.meterCards()[0].statusLabel).toBe('Checks pending');
  });
});

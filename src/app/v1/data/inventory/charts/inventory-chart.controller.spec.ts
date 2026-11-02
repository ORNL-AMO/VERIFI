import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { reportSnapshot } from '@app/v1/reports/facility/testing/report-test-fixtures';
import { InventoryToolsContext, InventoryToolsSource } from '../inventory-tools.models';
import { InventoryChartController } from './inventory-chart.controller';

@Component({ standalone: true, template: '' })
class ChartOwner {
  readonly context = signal<InventoryToolsContext>({ accountGuid: 'account-a', facilityGuid: undefined, resource: 'meters' });
  readonly matching = signal<readonly string[]>(['matching-a', 'matching-b']);
  readonly source: InventoryToolsSource = { context: this.context, matchingGuids: this.matching,
    scopeGuids: signal(['matching-a', 'matching-b', 'filtered-out']), filtersKey: signal('') };
  readonly chart = new InventoryChartController(this.source);
}

function setup() {
  const store = new AccountWorkspaceStore(), snapshot = reportSnapshot();
  store.publish({ ...snapshot, facilities: [snapshot.facilities[0], { ...snapshot.facilities[0], guid: 'facility-b' }] });
  const started = vi.fn(), stopped = vi.fn();
  const calendarizeBase = vi.fn(() => new Observable(subscriber => {
    started(); subscriber.next({ state: 'ready', meters: [] });
    return stopped;
  }));
  const project = vi.fn(() => ({ state: 'ready', meters: [] }));
  TestBed.configureTestingModule({ imports: [ChartOwner], providers: [
    { provide: AccountWorkspaceStore, useValue: store },
    { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase, project } }
  ] });
  const fixture = TestBed.createComponent(ChartOwner); fixture.detectChanges();
  return { fixture, owner: fixture.componentInstance, started, stopped, calendarizeBase, project };
}

describe('inventory chart owner lifetime', () => {
  it('requests Meter computation only while open and releases it for Predictor mode, closing, and destruction', () => {
    const { fixture, owner, started, stopped, calendarizeBase, project } = setup();
    expect(calendarizeBase).not.toHaveBeenCalled();
    owner.chart.show(); fixture.detectChanges(); owner.chart.charts();
    expect(started).toHaveBeenCalledOnce();
    expect(project).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ meterGuids: ['matching-a', 'matching-b'] }));
    owner.matching.set(['matching-b']); fixture.detectChanges(); owner.chart.charts();
    expect(project).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ meterGuids: ['matching-b'] }));
    owner.context.update(context => ({ ...context, resource: 'predictors' })); fixture.detectChanges();
    expect(stopped).toHaveBeenCalledOnce();
    owner.chart.close(); fixture.detectChanges();
    expect(started).toHaveBeenCalledOnce();
    owner.context.update(context => ({ ...context, resource: 'meters' })); fixture.detectChanges();
    expect(started).toHaveBeenCalledOnce();
    owner.chart.show(); fixture.detectChanges(); expect(started).toHaveBeenCalledTimes(2);
    fixture.destroy(); expect(stopped).toHaveBeenCalledTimes(2);
  });

  it('restores scope preferences and retains session memory after the routed owner is recreated', () => {
    const { fixture, owner, calendarizeBase } = setup();
    owner.chart.form.controls.grouping.setValue('meters');
    owner.chart.view.set({ ...owner.chart.view(), hiddenGuids: ['hidden'], tracePanelOpen: false, collapsedTraceFacilities: ['facility-a'] });
    owner.chart.zoom.set({ start: 20, end: 60 });
    owner.context.update(context => ({ ...context, facilityGuid: 'facility-b' })); fixture.detectChanges();
    expect(owner.chart.grouping()).toBe('groups'); expect(owner.chart.zoom()).toEqual({ start: 0, end: 100 });
    owner.chart.form.controls.grouping.setValue('facilities');
    owner.context.update(context => ({ ...context, facilityGuid: undefined })); fixture.detectChanges();
    expect(owner.chart.grouping()).toBe('meters');
    expect(owner.chart.view()).toMatchObject({ hiddenGuids: ['hidden'], tracePanelOpen: false, collapsedTraceFacilities: ['facility-a'] });
    expect(owner.chart.zoom()).toEqual({ start: 20, end: 60 });
    fixture.destroy();
    const returned = TestBed.createComponent(ChartOwner); returned.detectChanges();
    expect(returned.componentInstance.chart.grouping()).toBe('meters');
    expect(returned.componentInstance.chart.zoom()).toEqual({ start: 20, end: 60 });
    expect(calendarizeBase).not.toHaveBeenCalled();
    returned.destroy();
  });
});

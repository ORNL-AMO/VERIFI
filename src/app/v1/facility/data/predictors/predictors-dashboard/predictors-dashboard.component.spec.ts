import { EChartsChartDirective } from '@app/v1/shared/charts/echarts-chart.directive';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { PredictorDeletionPreview } from '@data/account-workspace/handlers/predictor-command-handler.service';
import { BrowseStateService } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PredictorWorkspaceActionsService } from '../predictor-workspace-actions.service';
import { inventoryNavigation, inventoryWorkspace } from '../predictor-inventory/predictor-inventory.testing';
import { PredictorsDashboardComponent } from './predictors-dashboard.component';

export function dashboardFixture(count = 3) {
  const workspace = inventoryWorkspace(count);
  const actions = {
    createPredictor: vi.fn(async () => workspace.predictors()[0]), copyPredictor: vi.fn(async () => workspace.predictors()[0]),
    previewDeletion: vi.fn((guids: readonly string[]): PredictorDeletionPreview => structuredClone({ facilityGuid: workspace.facility()!.guid,
      predictors: workspace.predictors().filter(item => guids.includes(item.guid)), predictorData: workspace.predictorReadings().filter(item => guids.includes(item.predictorId)), facilityAnalyses: [] })),
    deletePredictors: vi.fn(async (_preview: PredictorDeletionPreview) => {})
  };
  const portal = { show: vi.fn(), hide: vi.fn() };
  TestBed.configureTestingModule({ imports: [PredictorsDashboardComponent], providers: [provideRouter([]),
    { provide: FacilityPredictorsWorkspaceService, useValue: workspace }, { provide: PredictorWorkspaceActionsService, useValue: actions },
    { provide: WorkspaceNavigationService, useValue: inventoryNavigation }, { provide: ModalPortalService, useValue: portal }] });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(PredictorsDashboardComponent); fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, workspace, actions, navigate, portal };
}

describe('compact Predictor dashboard', () => {
  beforeEach(() => vi.spyOn(EChartsChartDirective.prototype, 'ngAfterViewInit').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());
  it('pages individuals while preserving station headings, selects a preview, and expands the full list', () => {
    const { fixture, component } = dashboardFixture(20);
    expect(component.visible()).toHaveLength(8); expect(component.matching()).toHaveLength(20);
    expect(component.preview()?.guid).toBe(component.visible()[0].guid);
    component.selectPreview(component.visible()[1].guid); component.zoom.set({ start: 20, end: 60 });
    component.startSelection(); component.selectAll(); expect(component.selected()).toHaveLength(20);
    component.changePage(2); fixture.detectChanges();
    expect(component.currentPage()).toBe(2); expect(component.visible()).toHaveLength(8); expect(component.selected()).toHaveLength(20);
    expect(component.zoom()).toEqual({ start: 0, end: 100 });
    component.toggleExpanded(); fixture.detectChanges(); expect(component.visible()).toHaveLength(20);
    expect(fixture.nativeElement.querySelector('app-predictor-preview')).toBeNull();
    component.toggleExpanded(); fixture.detectChanges(); expect(component.currentPage()).toBe(2);
    component.filtersForm.controls.search.setValue('p20'); fixture.detectChanges();
    expect(component.currentPage()).toBe(1); expect(component.selected()).toEqual([]); expect(component.showFooter()).toBe(false);
  });
  it('routes standard and weather actions through their existing workflows', () => {
    const { component, navigate } = dashboardFixture();
    component.handleAction({ guid: 'p1', action: 'settings' }); expect(navigate).toHaveBeenLastCalledWith(inventoryNavigation.facilityPredictorRoute('facility', 'p1', 'settings'));
    component.handleAction({ guid: 'p2', action: 'readings' }); expect(navigate).toHaveBeenLastCalledWith(inventoryNavigation.facilityWeatherPredictorRoute('facility', 'station:KORD', 'readings'));
    component.handleAction({ guid: 'p2', action: 'quality' }); expect(navigate).toHaveBeenLastCalledWith(inventoryNavigation.facilityWeatherPredictorQualityRoute('facility', 'station:KORD', 'p2'));
  });
  it('preserves selection on cancel/failure, invalidates stale review, and exits after success', async () => {
    const { fixture, component, actions, workspace } = dashboardFixture();
    component.startSelection(); component.selectAll(); component.requestDeleteSelected(); fixture.detectChanges();
    expect(component.deletion()?.predictors).toHaveLength(3); expect(component.deletion()?.predictorData).toHaveLength(3);
    component.closeConfirmation(); expect(component.selected()).toHaveLength(3);
    component.requestDeleteSelected(); actions.deletePredictors.mockRejectedValueOnce(new Error('Write failed'));
    await component.confirmDelete(); fixture.detectChanges(); expect(component.actionError()).toBe('Write failed'); expect(component.selected()).toHaveLength(3);
    workspace.revision.update(value => value + 1); workspace.predictorReadings.update(rows => rows.slice(1)); fixture.detectChanges();
    expect(component.deletion()).toBeUndefined(); expect(component.actionError()).toContain('changed');
    component.requestDeleteSelected(); await component.confirmDelete(); fixture.detectChanges(); expect(component.selected()).toEqual([]); expect(component.selecting()).toBe(false);
  });
  it('restores filters, page, preview and zoom after a workbench visit without deletion selection', () => {
    const { fixture, component } = dashboardFixture(20);
    component.filtersForm.controls.sort.setValue('predictorName'); fixture.detectChanges(); component.changePage(2); fixture.detectChanges();
    const selected = component.visible()[2].guid; component.selectPreview(selected); component.zoom.set({ start: 10, end: 70 }); component.startSelection(); component.selectAll(); fixture.detectChanges();
    fixture.destroy();
    const returned = TestBed.createComponent(PredictorsDashboardComponent); returned.detectChanges();
    expect(returned.componentInstance.currentPage()).toBe(2); expect(returned.componentInstance.previewGuid()).toBe(selected);
    expect(returned.componentInstance.zoom()).toEqual({ start: 10, end: 70 }); expect(returned.componentInstance.selecting()).toBe(false);
    expect(TestBed.inject(BrowseStateService).origin('account')).toBe('facilities');
  });
  it('guards writes, leaves pending/unavailable checks neutral, and prunes live deletion selections', () => {
    const { fixture, component, workspace, actions } = dashboardFixture();
    component.startSelection(); component.selectAll(); workspace.predictors.update(items => items.slice(1)); fixture.detectChanges(); expect(component.selected()).toEqual(['p2', 'p3']);
    workspace.statusState.set('error'); workspace.canWrite.set(false); fixture.detectChanges();
    expect(component.entries().every(item => item.status.label === 'Checks unavailable')).toBe(true);
    component.requestDeleteSelected(); expect(actions.previewDeletion).not.toHaveBeenCalled();
    workspace.facility.set(undefined); fixture.detectChanges(); expect(component.selected()).toEqual([]); expect(component.selecting()).toBe(false);
  });
});

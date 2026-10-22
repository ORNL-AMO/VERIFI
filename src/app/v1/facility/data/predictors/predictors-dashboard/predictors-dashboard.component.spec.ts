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
  it('pages flat cards, offers detail and selection, and keeps charts independent of card filters', () => {
    const { fixture, component, portal } = dashboardFixture(50);
    expect(component.visible()).toHaveLength(24); expect(component.matching()).toHaveLength(50);
    expect(fixture.nativeElement.querySelectorAll('.portfolio-inventory .portfolio-tile')).toHaveLength(24);
    expect(component.tiles().every(tile => !tile.owner)).toBe(true);
    component.detailControl.setValue('summary'); component.setTileDetail({ guid: 'p1', level: 'detailed' }); fixture.detectChanges();
    expect(component.detail()).toBe('summary'); expect(component.overrides()).toEqual({ p1: 'detailed' });
    component.startSelection(); component.selectAll(); expect(component.selected()).toHaveLength(50);
    component.changePage(2); fixture.detectChanges();
    expect(component.currentPage()).toBe(2); expect(component.visible()).toHaveLength(24); expect(component.selected()).toHaveLength(50);
    component.openCharts(); expect(component.chartsOpen()).toBe(true); expect(portal.show).toHaveBeenCalled();
    component.zoom.set({ start: 20, end: 60 });
    component.filtersForm.controls.search.setValue('p20'); fixture.detectChanges();
    expect(component.currentPage()).toBe(1); expect(component.selected()).toEqual([]);
    expect(component.chartViews().flatMap(chart => chart.metrics)).toHaveLength(50);
    expect(component.zoom()).toEqual({ start: 20, end: 60 });
    component.detailControl.setValue('detailed'); expect(component.overrides()).toEqual({});
    component.closeCharts(); expect(portal.hide).toHaveBeenCalled();
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
  it('restores filters, card detail, page and zoom after a workbench visit without deletion selection', () => {
    const { fixture, component } = dashboardFixture(50);
    component.filtersForm.controls.sort.setValue('predictorName'); fixture.detectChanges(); component.changePage(2); fixture.detectChanges();
    component.detailControl.setValue('summary'); component.setTileDetail({ guid: 'p1', level: 'detailed' });
    component.chartView.update(view => ({ ...view, metric: 'p49' })); component.zoom.set({ start: 10, end: 70 }); component.startSelection(); component.selectAll(); fixture.detectChanges();
    fixture.destroy();
    const returned = TestBed.createComponent(PredictorsDashboardComponent); returned.detectChanges();
    expect(returned.componentInstance.currentPage()).toBe(2); expect(returned.componentInstance.detail()).toBe('summary');
    expect(returned.componentInstance.overrides()).toEqual({ p1: 'detailed' }); expect(returned.componentInstance.chartView().metric).toBe('p49');
    expect(returned.componentInstance.zoom()).toEqual({ start: 10, end: 70 }); expect(returned.componentInstance.selecting()).toBe(false);
    expect(TestBed.inject(BrowseStateService).origin('account')).toBe('facilities');
  });
  it('preserves saved card state through transient workspace unloading and prunes deleted overrides after a committed load', () => {
    const { fixture, component, workspace } = dashboardFixture(50);
    component.changePage(2); component.setTileDetail({ guid: 'p1', level: 'detailed' }); fixture.detectChanges();
    workspace.canWrite.set(false); workspace.predictors.set([]); fixture.detectChanges(); fixture.destroy();
    workspace.predictors.set(inventoryWorkspace(50).predictors()); workspace.canWrite.set(true);
    const returned = TestBed.createComponent(PredictorsDashboardComponent); returned.detectChanges();
    expect(returned.componentInstance.currentPage()).toBe(2); expect(returned.componentInstance.overrides()).toEqual({ p1: 'detailed' });
    workspace.predictors.update(items => items.filter(item => item.guid !== 'p1')); returned.detectChanges();
    expect(returned.componentInstance.overrides()).toEqual({});
  });
  it('keeps weather reading and quality actions, omits copying weather, and disables unsupported legacy deletion', () => {
    const { fixture, component, workspace } = dashboardFixture();
    expect(component.tileActions()['p2'].map(action => action.id)).toEqual(['readings', 'quality', 'delete']);
    workspace.predictors.update(items => items.map(item => item.guid === 'p1' ? { ...item, predictorType: 'Math' } : item));
    component.startSelection(); fixture.detectChanges();
    const checkbox = fixture.nativeElement.querySelector('[aria-label="Select p1"]') as HTMLInputElement;
    expect(checkbox.disabled).toBe(true); expect(component.tileActions()['p1'].map(action => action.id)).toEqual(['readings']);
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

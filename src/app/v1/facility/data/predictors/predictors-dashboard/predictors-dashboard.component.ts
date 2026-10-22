import { facilityContextBreadcrumbs } from '@app/v1/shared/page-identity/facility-context-breadcrumbs';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, TemplateRef, ViewContainerRef, computed, effect, inject, linkedSignal, signal, untracked, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { PredictorDeletionPreview, predictorDeletionSnapshot } from '@data/account-workspace/handlers/predictor-command-handler.service';
import { buildFacilityAnalysesWithoutPredictors } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { BrowsePositionDirective } from '@app/v1/shared/navigation/browse-state/browse-position.directive';
import { BrowseKey, BrowseStateService, FacilityPredictorBrowseView, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { PageIdentityComponent, PageBreadcrumb } from '@app/v1/shared/page-identity/page-identity.component';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PredictorWorkspaceActionsService } from '../predictor-workspace-actions.service';
import { PredictorDraft } from '../models';
import { buildPredictorInventory, filterPredictorInventory, groupPredictorInventory, orderPredictorInventory, PredictorInventoryActionRequest, PredictorInventorySort, PredictorStatusFilter, PredictorTypeFilter } from '../predictor-inventory/predictor-inventory.models';
import { PredictorDraftSlideoutComponent } from './predictor-draft-slideout/predictor-draft-slideout.component';
import { InventoryGridComponent } from '@app/v1/shared/inventory/inventory-grid/inventory-grid.component';
import { InventoryDetailLevel, InventoryTileActionRequest, InventoryTileDetailChange, InventoryTileMenuAction } from '@app/v1/shared/inventory/inventory.models';
import { InventoryChartSheetComponent } from '@app/v1/shared/charts/inventory-chart-sheet/inventory-chart-sheet.component';
import { InventoryChartSheetView, DEFAULT_INVENTORY_CHART_VIEW } from '@app/v1/shared/charts/inventory-chart-sheet/inventory-chart-sheet.models';
import { InventoryChartDockComponent } from '@app/v1/shared/charts/inventory-chart-dock/inventory-chart-dock.component';
import { InventorySeriesStyle, buildInventoryChartStyles } from '@app/v1/shared/charts/inventory-chart-styles';
import { buildPredictorTiles } from '../predictor-inventory/predictor-tile.view';
import { buildPredictorCharts } from './predictor-chart.view';

@Component({ selector: 'app-predictors-dashboard', standalone: true,
  templateUrl: './predictors-dashboard.component.html', styleUrls: ['./predictors-dashboard.component.css'],
  imports: [ReactiveFormsModule, RouterLink, IconComponent, ConfirmationDialogComponent, BrowseHeaderDirective, BrowsePositionDirective, PageIdentityComponent, InventoryGridComponent, InventoryChartSheetComponent, InventoryChartDockComponent, PredictorDraftSlideoutComponent] })
export class PredictorsDashboardComponent {
  private readonly router = inject(Router);
  private readonly actions = inject(PredictorWorkspaceActionsService);
  private readonly portal = inject(ModalPortalService);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly destroy = inject(DestroyRef);
  private readonly browseState = inject(BrowseStateService);
  private readonly sticky = viewChild(BrowseHeaderDirective);
  private readonly addPanel = viewChild.required<TemplateRef<unknown>>('addPanel');
  private readonly confirmation = viewChild.required<TemplateRef<unknown>>('confirmation');
  private readonly chartSheet = viewChild.required<TemplateRef<unknown>>('chartSheet');
  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly filtersForm = new FormGroup({ search: new FormControl('', { nonNullable: true }),
    type: new FormControl<PredictorTypeFilter>('all', { nonNullable: true }), status: new FormControl<PredictorStatusFilter>('all', { nonNullable: true }),
    sort: new FormControl<PredictorInventorySort>('attention', { nonNullable: true }) });
  readonly browseKey = computed<BrowseKey<'facilityPredictors'> | undefined>(() => {
    const account = this.workspace.account(), facility = this.workspace.facility();
    return account && facility ? { kind: 'facilityPredictors', accountGuid: account.guid, facilityGuid: facility.guid } : undefined;
  });
  readonly filters = rememberBrowseForm(this.browseKey, this.filtersForm);
  readonly pageControl = new FormControl(1, { nonNullable: true });
  private readonly page = toSignal(this.pageControl.valueChanges, { initialValue: 1 });
  readonly pageSize = 24;
  readonly detailControl = new FormControl<InventoryDetailLevel>('summary', { nonNullable: true });
  readonly detail = signal<InventoryDetailLevel>('summary');
  readonly overrides = signal<Readonly<Record<string, InventoryDetailLevel>>>({});
  readonly layoutReady = signal(false);
  readonly chartsOpen = signal(false);
  readonly chartView = signal<InventoryChartSheetView>(DEFAULT_INVENTORY_CHART_VIEW);
  readonly saving = signal(false);
  readonly actionError = signal('');
  readonly addPredictorOpen = signal(false);
  readonly selecting = signal(false);
  readonly selected = signal<readonly string[]>([]);
  readonly deletion = signal<PredictorDeletionPreview | undefined>(undefined);
  readonly zoom = signal({ start: 0, end: 100 });
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly collapsed = computed(() => this.sticky()?.collapsed() ?? false);
  readonly browseReady = computed(() => this.workspace.canWrite() && !['idle', 'evaluating'].includes(this.workspace.statusState()) && (!this.matching().length || this.layoutReady()));
  readonly breadcrumbs = computed<readonly PageBreadcrumb[]>(() => {
    const account = this.workspace.account(), facility = this.workspace.facility();
    return account && facility ? facilityContextBreadcrumbs(this.navigation.isSingleSiteWorkspace(),
      { label: account.name, route: this.navigation.accountDataReturnRoute(account.guid) }, { label: facility.name }) : [];
  });
  readonly entries = computed(() => {
    const facility = this.workspace.facility();
    return facility ? buildPredictorInventory(this.workspace.predictorCards(), this.workspace.weatherStationGroups(), facility, this.workspace.statusState()) : [];
  });
  readonly matching = computed(() => orderPredictorInventory(filterPredictorInventory(this.entries(), this.filters()), this.filters().sort));
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.matching().length / this.pageSize)));
  readonly currentPage = computed(() => Math.max(1, Math.min(this.page(), this.pageCount())));
  readonly pageStart = computed(() => this.matching().length ? (this.currentPage() - 1) * this.pageSize + 1 : 0);
  readonly pageEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.matching().length));
  readonly visible = computed(() => this.matching().slice(this.pageStart() - 1, this.pageEnd()));
  readonly browseIds = computed(() => this.visible().map(item => item.guid));
  readonly tiles = computed(() => buildPredictorTiles(this.matching(), this.navigation, this.workspace.predictorReadings(), this.workspace.statusState(), false));
  readonly visibleTiles = computed(() => this.tiles().slice(this.pageStart() - 1, this.pageEnd()));
  readonly tileActions = computed(() => Object.fromEntries(this.entries().map(entry => {
    const actions: InventoryTileMenuAction[] = [{ id: 'readings', label: 'Open readings', icon: 'invoice' }];
    if (entry.station) actions.push({ id: 'quality', label: 'Quality Report', icon: 'warning' });
    if (entry.canCopy) actions.push({ id: 'copy', label: 'Copy predictor', icon: 'copy', disabled: !this.canAct() });
    if (entry.canDelete) actions.push({ id: 'delete', label: 'Delete predictor', icon: 'delete', disabled: !this.canAct() });
    return [entry.guid, actions];
  })));
  readonly selectable = computed(() => Object.fromEntries(this.entries().map(entry => [entry.guid, entry.canDelete])));
  readonly chartStyles = linkedSignal<{ context: string; guids: readonly string[] }, ReadonlyMap<string, InventorySeriesStyle>>({
    source: () => ({ context: JSON.stringify(this.browseKey()), guids: this.entries().map(entry => entry.guid) }),
    computation: (source, previous) => buildInventoryChartStyles(source.guids, previous?.source.context === source.context ? previous.value : undefined)
  });
  readonly chartViews = computed(() => buildPredictorCharts(this.entries(), this.workspace.predictorReadings(), this.chartStyles()));
  readonly deletionGroups = computed(() => {
    const ids = new Set(this.deletion()?.predictors.map(item => item.guid));
    return groupPredictorInventory(this.entries().filter(item => ids.has(item.guid)), 'predictorName');
  });
  readonly affectedAnalyses = computed(() => {
    const preview = this.deletion(); if (!preview) return [];
    const updated = buildFacilityAnalysesWithoutPredictors(preview.facilityAnalyses, new Set(preview.predictors.map(item => item.guid)));
    return preview.facilityAnalyses.filter((analysis, index) => predictorDeletionSnapshot(analysis) !== predictorDeletionSnapshot(updated[index]));
  });

  constructor() {
    let previousContext = '', previousFilter = '', previousSort = '';
    let previousKey: BrowseKey<'facilityPredictors'> | undefined;
    let previousView: FacilityPredictorBrowseView | undefined;
    const detailSubscription = this.detailControl.valueChanges.subscribe(level => { this.detail.set(level); this.overrides.set({}); });
    this.destroy.onDestroy(() => detailSubscription.unsubscribe());
    effect(() => {
      const key = this.browseKey(), context = JSON.stringify(key);
      const filters = this.filters(), filter = JSON.stringify([filters.search, filters.status, filters.type]);
      const entries = this.entries(); this.page(); this.pageCount(); this.detail(); this.overrides(); this.zoom(); this.chartView();
      if (!this.workspace.canWrite()) {
        if (context !== previousContext) { this.closePortal(); this.selecting.set(false); this.selected.set([]); }
        return;
      }
      untracked(() => {
        if (context !== previousContext) {
          if (previousKey && previousView) this.browseState.savePredictorView(previousKey, previousView);
          this.closePortal(); this.actionError.set(''); this.selecting.set(false); this.selected.set([]);
          const restored = key ? this.browseState.readPredictorView(key) : undefined;
          this.pageControl.setValue(Math.min(restored?.page ?? 1, this.pageCount()));
          this.detail.set(restored?.detail ?? 'summary'); this.detailControl.setValue(restored?.detail ?? 'summary', { emitEvent: false });
          const existing = new Set(entries.map(entry => entry.guid));
          this.overrides.set(Object.fromEntries(Object.entries(restored?.overrides ?? {}).filter(([guid]) => existing.has(guid))));
          this.zoom.set(restored?.zoom ?? { start: 0, end: 100 });
          this.chartView.set({ ...DEFAULT_INVENTORY_CHART_VIEW, metric: restored?.chartGuid ?? DEFAULT_INVENTORY_CHART_VIEW.metric });
        } else {
          if (filter !== previousFilter) { this.selected.set([]); this.pageControl.setValue(1); this.closeConfirmation(); }
          else if (filters.sort !== previousSort) this.pageControl.setValue(1);
          else if (this.page() > this.pageCount()) this.pageControl.setValue(this.pageCount());
          const existing = new Set(entries.map(item => item.guid));
          this.selected.update(ids => ids.filter(id => existing.has(id)));
          const overrides = Object.fromEntries(Object.entries(this.overrides()).filter(([guid]) => existing.has(guid)));
          if (Object.keys(overrides).length !== Object.keys(this.overrides()).length) this.overrides.set(overrides);
        }
        if (this.chartView().metric !== DEFAULT_INVENTORY_CHART_VIEW.metric && !entries.some(entry => entry.guid === this.chartView().metric)) {
          this.chartView.set(DEFAULT_INVENTORY_CHART_VIEW); this.zoom.set({ start: 0, end: 100 });
        }
        previousKey = key; previousContext = context; previousFilter = filter; previousSort = filters.sort;
        previousView = this.viewState();
      });
    });
    effect(() => {
      this.workspace.revision(); this.workspace.predictorReadings(); this.entries();
      const reviewed = this.deletion(), saving = this.saving();
      untracked(() => {
        if (!reviewed || saving || !this.workspace.canWrite() || this.workspace.hasPending()) return;
        try {
          if (predictorDeletionSnapshot(this.actions.previewDeletion(reviewed.predictors.map(item => item.guid))) === predictorDeletionSnapshot(reviewed)) return;
        } catch { /* Deleted records also invalidate a reviewed selection. */ }
        this.closePortal(); this.actionError.set('Predictor data changed. Review the deletion again.');
      });
    });
    this.destroy.onDestroy(() => {
      if (previousKey && previousView) this.browseState.savePredictorView(previousKey, previousView);
      this.closePortal();
    });
  }
  private viewState(): FacilityPredictorBrowseView { return { page: this.currentPage(), detail: this.detail(), overrides: this.overrides(), chartGuid: this.chartView().metric, zoom: this.zoom() }; }
  setTileDetail(change: InventoryTileDetailChange): void { this.overrides.update(current => ({ ...current, [change.guid]: change.level })); }
  changePage(page: number): void { if (page >= 1 && page <= this.pageCount()) this.pageControl.setValue(page); }
  openCharts(): void {
    if (this.chartsOpen() || this.saving()) return;
    this.closePortal(); this.chartsOpen.set(true); this.portal.show(new TemplatePortal(this.chartSheet(), this.viewContainer));
  }
  closeCharts(): void { if (this.chartsOpen()) { this.portal.hide(); this.chartsOpen.set(false); } }
  navigateRoute(route: readonly string[]): void { void this.navigate([...route]); }
  clearFilters(): void { this.filtersForm.patchValue({ search: '', status: 'all', type: 'all' }); }
  startSelection(): void { if (this.canAct()) this.selecting.set(true); }
  cancelSelection(): void { if (!this.saving()) { this.selecting.set(false); this.selected.set([]); } }
  selectAll(): void { if (this.canAct()) this.selected.set(this.matching().filter(item => item.canDelete).map(item => item.guid)); }
  changeSelection(change: { guid: string; selected: boolean }): void {
    if (!this.canAct() || !this.selecting() || !this.entries().some(item => item.guid === change.guid && item.canDelete)) return;
    this.selected.update(ids => change.selected ? [...new Set([...ids, change.guid])] : ids.filter(id => id !== change.guid));
  }
  requestDeleteSelected(): void { this.requestDelete(this.selected()); }
  private requestDelete(guids: readonly string[]): void {
    if (!this.canAct() || !guids.length) return;
    try {
      this.deletion.set(this.actions.previewDeletion(guids)); this.actionError.set('');
      this.portal.show(new TemplatePortal(this.confirmation(), this.viewContainer));
    } catch (error) { this.actionError.set(error instanceof Error ? error.message : 'The selection could not be reviewed.'); }
  }
  closeConfirmation(): void { if (!this.saving() && this.deletion()) this.closePortal(); }
  openAddPredictor(): void {
    if (!this.canAct()) return;
    this.closeCharts(); this.actionError.set(''); this.addPredictorOpen.set(true); this.portal.show(new TemplatePortal(this.addPanel(), this.viewContainer));
  }
  closeAddPredictor(): void { if (!this.saving()) this.closePortal(); }
  private closePortal(): void {
    if (this.addPredictorOpen() || this.deletion() || this.chartsOpen()) this.portal.hide();
    this.chartsOpen.set(false);
    this.addPredictorOpen.set(false); this.deletion.set(undefined);
  }
  async openWeatherWorkbench(): Promise<void> {
    const facility = this.workspace.facility(); if (!facility || !this.canAct()) return;
    this.closePortal(); await this.navigate(this.navigation.facilityWeatherPredictorCreateRoute(facility.guid));
  }
  async savePredictorDraft(draft: PredictorDraft): Promise<void> {
    await this.runAction(async isCurrent => {
      const predictor = await this.actions.createPredictor(draft);
      if (!isCurrent()) return;
      this.closePortal(); await this.navigate(this.navigation.facilityPredictorRoute(predictor.facilityId, predictor.guid, 'settings'));
    });
  }
  async confirmDelete(): Promise<void> {
    const reviewed = this.deletion(); if (!reviewed) return;
    await this.runAction(async isCurrent => {
      await this.actions.deletePredictors(reviewed); if (!isCurrent()) return;
      this.selected.set([]); this.selecting.set(false); this.closePortal();
    });
  }
  handleAction(request: PredictorInventoryActionRequest | InventoryTileActionRequest): void {
    if (request.action === 'details' || request.action === 'active' || request.action === 'compare') return;
    const entry = this.entries().find(item => item.guid === request.guid); if (!entry) return;
    if (request.action === 'delete') { this.requestDelete([entry.guid]); return; }
    if (request.action === 'copy') {
      if (!entry.canCopy) return;
      void this.runAction(async isCurrent => {
        const copy = await this.actions.copyPredictor(entry.card.predictor);
        if (isCurrent()) await this.navigate(this.navigation.facilityPredictorRoute(copy.facilityId, copy.guid, 'settings'));
      }); return;
    }
    const route = entry.station ? request.action === 'quality'
      ? this.navigation.facilityWeatherPredictorQualityRoute(entry.facility.guid, entry.station.routeKey, entry.guid)
      : this.navigation.facilityWeatherPredictorRoute(entry.facility.guid, entry.station.routeKey, request.action === 'readings' ? 'readings' : 'setup')
      : this.navigation.facilityPredictorRoute(entry.facility.guid, entry.guid, request.action);
    void this.navigate(route);
  }
  private async navigate(route: string[]): Promise<void> {
    try { await this.router.navigate(route); } catch { this.actionError.set('The predictor could not be opened. Please try again.'); }
  }
  private async runAction(action: (isCurrent: () => boolean) => Promise<void>): Promise<void> {
    if (!this.canAct()) return;
    const key = JSON.stringify(this.browseKey());
    const isCurrent = () => !this.destroy.destroyed && key === JSON.stringify(this.browseKey());
    this.saving.set(true); this.actionError.set('');
    try { await action(isCurrent); }
    catch (error) { if (isCurrent()) this.actionError.set(error instanceof Error ? error.message : 'The predictor change could not be saved.'); }
    finally { if (!this.destroy.destroyed) this.saving.set(false); }
  }
}

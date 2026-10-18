import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, ElementRef, TemplateRef, ViewContainerRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
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
import { buildPredictorInventory, buildPredictorPreviewRows, filterPredictorInventory, groupPredictorInventory, orderPredictorInventory, PredictorInventoryActionRequest, PredictorInventorySort, PredictorStatusFilter, PredictorTypeFilter } from '../predictor-inventory/predictor-inventory.models';
import { PredictorDirectoryComponent } from '../predictor-inventory/predictor-directory/predictor-directory.component';
import { PredictorDraftSlideoutComponent } from './predictor-draft-slideout/predictor-draft-slideout.component';
import { PredictorPreviewComponent } from './predictor-preview/predictor-preview.component';

@Component({ selector: 'app-predictors-dashboard', standalone: true,
  templateUrl: './predictors-dashboard.component.html', styleUrls: ['./predictors-dashboard.component.css'],
  imports: [ReactiveFormsModule, RouterLink, IconComponent, ConfirmationDialogComponent, BrowseHeaderDirective, BrowsePositionDirective, PageIdentityComponent, PredictorDirectoryComponent, PredictorDraftSlideoutComponent, PredictorPreviewComponent] })
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
  private readonly displayToggle = viewChild<ElementRef<HTMLButtonElement>>('displayToggle');
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
  readonly pageSize = 8;
  readonly expanded = signal(false);
  readonly saving = signal(false);
  readonly actionError = signal('');
  readonly addPredictorOpen = signal(false);
  readonly selecting = signal(false);
  readonly selected = signal<readonly string[]>([]);
  readonly deletion = signal<PredictorDeletionPreview | undefined>(undefined);
  readonly previewGuid = signal<string | undefined>(undefined);
  readonly zoom = signal({ start: 0, end: 100 });
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly collapsed = computed(() => this.sticky()?.collapsed() ?? false);
  readonly browseReady = computed(() => this.workspace.canWrite() && !['idle', 'evaluating'].includes(this.workspace.statusState()));
  readonly breadcrumbs = computed<readonly PageBreadcrumb[]>(() => {
    const account = this.workspace.account(), facility = this.workspace.facility();
    return account && facility ? [{ label: account.name, route: this.navigation.accountDataReturnRoute(account.guid) }, { label: facility.name }] : [];
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
  readonly showFooter = computed(() => this.pageCount() > 1 || this.expanded());
  readonly visible = computed(() => this.expanded() ? this.matching() : this.matching().slice(this.pageStart() - 1, this.pageEnd()));
  readonly browseIds = computed(() => this.visible().map(item => item.guid));
  readonly preview = computed(() => this.visible().find(item => item.guid === this.previewGuid()));
  readonly previewRows = computed(() => buildPredictorPreviewRows(this.preview(), this.workspace.predictorReadings()));
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
    effect(() => {
      const key = this.browseKey(), context = JSON.stringify(key);
      const filters = this.filters(), filter = JSON.stringify([filters.search, filters.status, filters.type]);
      const entries = this.entries(); this.page(); this.pageCount(); this.expanded(); this.previewGuid(); this.zoom();
      untracked(() => {
        if (context !== previousContext) {
          if (previousKey && previousView) this.browseState.savePredictorView(previousKey, previousView);
          this.closePortal(); this.actionError.set(''); this.selecting.set(false); this.selected.set([]);
          const restored = key ? this.browseState.readPredictorView(key) : undefined;
          this.pageControl.setValue(Math.min(restored?.page ?? 1, this.pageCount())); this.expanded.set(restored?.expanded ?? false);
          this.previewGuid.set(restored?.previewGuid); this.zoom.set(restored?.zoom ?? { start: 0, end: 100 });
        } else {
          if (filter !== previousFilter) { this.selected.set([]); this.pageControl.setValue(1); this.closeConfirmation(); }
          else if (filters.sort !== previousSort) this.pageControl.setValue(1);
          else if (this.page() > this.pageCount()) this.pageControl.setValue(this.pageCount());
          const existing = new Set(entries.map(item => item.guid));
          this.selected.update(ids => ids.filter(id => existing.has(id)));
        }
        const visible = this.visible();
        if (!visible.some(item => item.guid === this.previewGuid())) this.selectPreview(visible[0]?.guid);
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
      if (previousKey) this.browseState.savePredictorView(previousKey, this.viewState());
      this.closePortal();
    });
  }
  private viewState(): FacilityPredictorBrowseView { return { page: this.currentPage(), expanded: this.expanded(), previewGuid: this.previewGuid(), zoom: this.zoom() }; }
  selectPreview(guid: string | undefined): void { if (guid !== this.previewGuid()) { this.previewGuid.set(guid); this.zoom.set({ start: 0, end: 100 }); } }
  changePage(page: number): void { if (page >= 1 && page <= this.pageCount()) this.pageControl.setValue(page); }
  toggleExpanded(): void { this.expanded.update(value => !value); if (!this.expanded()) this.displayToggle()?.nativeElement.focus(); }
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
    this.actionError.set(''); this.addPredictorOpen.set(true); this.portal.show(new TemplatePortal(this.addPanel(), this.viewContainer));
  }
  closeAddPredictor(): void { if (!this.saving()) this.closePortal(); }
  private closePortal(): void {
    if (this.addPredictorOpen() || this.deletion()) this.portal.hide();
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
  openStation(key: string): void { const facility = this.workspace.facility(); if (facility) void this.navigate(this.navigation.facilityWeatherPredictorRoute(facility.guid, key)); }
  handleAction(request: PredictorInventoryActionRequest): void {
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

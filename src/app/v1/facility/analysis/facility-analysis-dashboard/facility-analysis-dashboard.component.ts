import { facilityContextBreadcrumbs } from '@app/v1/shared/page-identity/facility-context-breadcrumbs';
import { AnalysisComparisonState, AnalysisComparisonOption } from '@app/v1/shared/analysis-comparison/analysis-comparison-state';
import { AnalysisComparisonSheetComponent } from '@app/v1/shared/analysis-comparison/analysis-comparison-sheet/analysis-comparison-sheet.component';
import { InventoryChartDockComponent } from '@app/v1/shared/charts/inventory-chart-dock/inventory-chart-dock.component';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateModule } from '@app/v1/shared/data-empty-state/data-empty-state.module';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityAnalysisWorkspaceService } from './facility-analysis-workspace.service';
import { FacilityAnalysisCard, FacilityAnalysisDashboardCard } from './facility-analysis.models';
import { AnalysisDraftSlideoutComponent } from './analysis-draft-slideout/analysis-draft-slideout.component';
import { FacilityAnalysisActionsService } from './facility-analysis-actions.service';
import { AnalysisCategory } from '@data/models/analysis';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FacilityAnalysisDashboardResultsService } from './facility-analysis-dashboard-results.service';
import { facilityAnalysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { FacilityAnalysisComparisonComponent } from './facility-analysis-comparison/facility-analysis-comparison.component';
import { AnalysisDetailsSlideoutComponent } from './analysis-details-slideout/analysis-details-slideout.component';

import { InventoryGridComponent } from '@app/v1/shared/inventory/inventory-grid/inventory-grid.component';
import { InventoryTileActionRequest, InventoryTileMenuAction } from '@app/v1/shared/inventory/inventory.models';
import { BrowseFilters, BrowseKey, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { BrowsePositionDirective } from '@app/v1/shared/navigation/browse-state/browse-position.directive';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { PageBreadcrumb, PageIdentityComponent } from '@app/v1/shared/page-identity/page-identity.component';
import { PortfolioInventoryState } from '@app/v1/account/data/portfolio/portfolio-inventory-state';
import { AnalysisInventoryEntry, analysisInventoryStatusLabel, analysisInventoryTile, filterAnalysisInventory } from '@app/v1/shared/analysis-inventory/analysis-inventory.models';

@Component({
  selector: 'app-facility-analysis-dashboard',
  host: { class: 'v1-analysis-dashboard-host' },
  standalone: true,
  imports: [AnalysisComparisonSheetComponent, InventoryChartDockComponent, IconComponent, DataEmptyStateModule, InventoryGridComponent, BrowsePositionDirective, BrowseHeaderDirective, PageIdentityComponent, AnalysisDraftSlideoutComponent, ConfirmationDialogComponent, ReactiveFormsModule, FacilityAnalysisComparisonComponent, AnalysisDetailsSlideoutComponent],
  providers: [FacilityAnalysisDashboardResultsService],
  templateUrl: './facility-analysis-dashboard.component.html',
  styleUrls: ['../../../shared/analysis-inventory/analysis-inventory.css', './facility-analysis-dashboard.component.css']
})
export class FacilityAnalysisDashboardComponent implements OnDestroy {
  @ViewChild('comparisonPanel', { static: true }) private comparisonPanel!: TemplateRef<unknown>;
  @ViewChild('activeConfirmation', { static: true }) private activeConfirmation!: TemplateRef<unknown>;
  @ViewChild('deleteConfirmation', { static: true }) private deleteConfirmation!: TemplateRef<unknown>;

  private readonly router = inject(Router);
  private readonly actions = inject(FacilityAnalysisActionsService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private confirmationPortal?: TemplatePortal;
  private confirmationKind: 'active' | 'delete' | undefined;
  readonly workspace = inject(FacilityAnalysisWorkspaceService);
  readonly results = inject(FacilityAnalysisDashboardResultsService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    category: new FormControl<BrowseFilters['facilityAnalyses']['category']>('all', { nonNullable: true }),
    status: new FormControl<BrowseFilters['facilityAnalyses']['status']>('all', { nonNullable: true }),
    sort: new FormControl<BrowseFilters['facilityAnalyses']['sort']>('attention', { nonNullable: true })
  });
  readonly browseKey = computed<BrowseKey<'facilityAnalyses'> | undefined>(() => {
    const account = this.workspace.account(), facility = this.workspace.facility();
    return account && facility && this.workspace.workspaceState() === 'ready'
      && facility.guid === this.navigation.routeState().facilityGuid && facility.accountId === account.guid
      ? { kind: 'facilityAnalyses', accountGuid: account.guid, facilityGuid: facility.guid } : undefined;
  });
  private readonly rememberedFilters = rememberBrowseForm(this.browseKey, this.filtersForm);
  readonly showCategory = computed(() => this.workspace.categories().length > 1);
  readonly filters = computed(() => this.showCategory() ? this.rememberedFilters() : { ...this.rememberedFilters(), category: 'all' as const });
  readonly entries = computed<readonly AnalysisInventoryEntry[]>(() => {
    const facility = this.workspace.facility();
    return facility ? this.workspace.cards().map(card => ({ scope: 'facility' as const, key: `facility:${card.analysis.guid}`,
      ownerName: facility.name || 'Facility', facility, card: { ...card, statusLabel: analysisInventoryStatusLabel(card.status, this.workspace.statusState()) } })) : [];
  });
  readonly filteredEntries = computed(() => filterAnalysisInventory(this.entries(), { ...this.filters(), scope: 'facility' }));
  private readonly baseTiles = computed(() => this.filteredEntries().map(entry => this.tile(entry, false)));
  // Status filters can be temporarily empty while checks run; do not save a clamped page yet.
  private readonly inventoryReady = computed(() => this.workspace.canWrite() && this.workspace.statusState() === 'ready');
  readonly inventory = new PortfolioInventoryState(this.browseKey, this.baseTiles, computed(() => this.entries().map(entry => entry.key)), this.filters, this.inventoryReady);
  readonly visibleTiles = computed(() => this.inventory.visibleTiles().map(tile => this.tile(this.entries().find(entry => entry.key === tile.guid)!)));
  readonly printTiles = computed(() => this.filteredEntries().map(entry => this.tile(entry)));
  readonly layoutReady = signal(false);
  readonly breadcrumbs = computed<readonly PageBreadcrumb[]>(() => {
    const account = this.workspace.account(), facility = this.workspace.facility();
    return account && facility ? facilityContextBreadcrumbs(this.navigation.isSingleSiteWorkspace(),
      { label: account.name || 'Account', route: this.navigation.accountAnalysisRoute(account.guid) },
      { label: facility.name || 'Facility' }) : [];
  });
  readonly countLabel = computed(() => `${this.filteredEntries().length} of ${this.entries().length} analyses`);
  readonly cards = computed<readonly FacilityAnalysisDashboardCard[]>(() => this.workspace.cards().map(card => {
    const outcome = this.results.states()[card.analysis.guid]
      ?? { state: 'loading' as const, message: 'Preparing data…' };
    return { ...card, outcome, outcomeDisplay: facilityAnalysisOutcomeDisplay(outcome, card.category) };
  }));
  readonly detailsGuid = signal<string | undefined>(undefined);
  readonly detailsCard = computed(() => this.cards().find(card => card.analysis.guid === this.detailsGuid()));
  readonly createOpen = signal(false);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly activeCandidate = signal<FacilityAnalysisCard | undefined>(undefined);
  readonly deleteCandidate = signal<FacilityAnalysisCard | undefined>(undefined);
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving() && !!this.browseKey());
  // Empty groups must not introduce a hidden category outside the facility's meters and saved analyses.
  private readonly creationCategories = computed(() => {
    const categories = this.workspace.categories();
    return (categories.length ? categories : ['energy', 'water'] as const)
      .filter(category => this.actions.categoryAvailable(category));
  });
  readonly energyAvailable = computed(() => this.creationCategories().includes('energy'));
  readonly waterAvailable = computed(() => this.creationCategories().includes('water'));
  readonly activeEligibility = computed(() => {
    const candidate = this.activeCandidate();
    return candidate ? this.actions.activeEligibility(candidate.analysis) : undefined;
  });
  readonly activeReplacement = computed(() => {
    const candidate = this.activeCandidate();
    const facility = this.workspace.facility();
    if (!candidate || !facility) return undefined;
    const guid = candidate.category === 'water' ? facility.selectedWaterAnalysisId : facility.selectedEnergyAnalysisId;
    return this.cards().find(card => card.analysis.guid === guid);
  });
  readonly comparisonOptions = computed<readonly AnalysisComparisonOption[]>(() => {
    const showCategory = this.showCategory();
    return this.workspace.cards().map(card => ({ key: `facility:${card.analysis.guid}`, scope: 'facility', category: card.category,
      facilityGuid: this.workspace.facility()?.guid, label: `${card.analysis.name || 'Untitled analysis'} · Facility analysis · ${this.workspace.facility()?.name || 'Facility'}${showCategory ? ' · ' + (card.category === 'water' ? 'Water' : 'Energy') : ''}` }));
  });
  readonly comparisonContext = computed(() => this.browseKey() && this.workspace.facility()
    ? `${this.workspace.account()?.guid}:${this.workspace.facility()!.guid}` : undefined);
  readonly comparison = new AnalysisComparisonState(this.comparisonOptions, this.comparisonContext);
  readonly comparisonGuids = this.comparison.selectedKeys;
  readonly comparisonCards = computed(() => this.comparison.complete() ? this.comparisonGuids()
    .map(key => this.cards().find(card => `facility:${card.analysis.guid}` === key)!)
    .filter(Boolean) : []);
  readonly resultDemand = computed(() => {
    const keys = new Set([...this.comparisonGuids(), this.detailsGuid() ? `facility:${this.detailsGuid()}` : undefined]);
    const overrides = this.inventory.overrides();
    for (const tile of this.inventory.visibleTiles()) if ((overrides[tile.guid] ?? this.inventory.detail()) !== 'simple') keys.add(tile.guid);
    return this.browseKey() ? this.entries().filter(entry => keys.has(entry.key)).map(entry => entry.card.analysis.guid) : [];
  });
  readonly browseReady = computed(() => !!this.browseKey() && this.inventory.ready() && !['idle', 'evaluating'].includes(this.workspace.statusState())
    && (!this.filteredEntries().length || this.layoutReady())
    && this.resultDemand().every(guid => !!this.results.states()[guid] && this.results.states()[guid].state !== 'loading'));
  readonly menuActions = computed<Readonly<Record<string, readonly InventoryTileMenuAction[]>>>(() => Object.fromEntries(this.entries().map(entry => [entry.key, [
    { id: 'details', label: 'View analysis details', icon: 'monocle' },
    { id: 'compare', label: 'Compare', icon: 'analysis' },
    ...(!entry.card.isActiveForReporting ? [{ id: 'active', label: 'Set active for facility reporting', icon: 'target', disabled: !this.canAct() }] : []),
    { id: 'copy', label: 'Copy analysis', icon: 'copy', disabled: !this.canAct() },
    { id: 'delete', label: 'Delete analysis', icon: 'delete', disabled: !this.canAct() }
  ] as InventoryTileMenuAction[]])));
  private contextKey?: string;
  private destroyed = false;
  constructor() {
    effect(() => this.results.setDemand(this.resultDemand()));
    effect(() => {
      const context = JSON.stringify(this.browseKey());
      if (context === this.contextKey) return;
      this.contextKey = context;
      this.clearComparison(); this.detailsGuid.set(undefined); this.createOpen.set(false);
      this.dismissActiveConfirmation(); this.dismissDeleteConfirmation(); this.actionError.set(undefined);
    });
  }
  private tile(entry: AnalysisInventoryEntry, withResults = true) {
    return analysisInventoryTile(entry, withResults ? this.results.states()[entry.card.analysis.guid] : undefined, this.workspace.meterGroups(), this.navigation,
      this.workspace.account()?.guid ?? '', this.workspace.statusState(), this.showCategory(), false);
  }
  clearFilters(): void { this.filtersForm.reset({ search: '', category: 'all', status: 'all', sort: 'attention' }); }
  async navigateRoute(route: readonly string[]): Promise<void> {
    try { await this.router.navigate([...route]); }
    catch { this.actionError.set('The analysis could not be opened. Please try again.'); }
  }
  requestAction(request: InventoryTileActionRequest): void {
    const card = this.workspace.cards().find(card => `facility:${card.analysis.guid}` === request.guid);
    if (!card) return;
    if (request.action === 'details') { this.createOpen.set(false); this.openDetails(card); }
    if (request.action === 'compare') this.openComparison(card);
    if (request.action === 'copy') void this.copy(card);
    if (request.action === 'active') this.requestActive(card);
    if (request.action === 'delete') this.requestDelete(card);
  }

  open(card: FacilityAnalysisCard): void {
    const facility = this.workspace.facility();
    if (facility) void this.navigateRoute(this.navigation.facilityAnalysisWorkbenchRoute(facility.guid, card.analysis.guid));
  }

  openCreate(): void { if (this.canAct()) { this.clearComparison(); this.detailsGuid.set(undefined); this.actionError.set(undefined); this.createOpen.set(true); } }
  closeCreate(): void { if (!this.saving()) this.createOpen.set(false); }

  async create(category: AnalysisCategory): Promise<void> {
    await this.runAction(async isCurrent => {
      const analysis = await this.actions.createAnalysis(category);
      if (!isCurrent()) return;
      this.createOpen.set(false);
      this.openAnalysisGuid(analysis.guid);
    });
  }

  async copy(card: FacilityAnalysisCard): Promise<void> {
    await this.runAction(async isCurrent => { const copy = await this.actions.copyAnalysis(card.analysis.guid); if (isCurrent()) this.openAnalysisGuid(copy.guid); });
  }

  requestActive(card: FacilityAnalysisCard): void {
    if (!this.canAct()) return;
    this.clearComparison(); this.detailsGuid.set(undefined); this.createOpen.set(false);
    this.actionError.set(undefined);
    this.activeCandidate.set(card);
    this.confirmationKind = 'active';
    this.showConfirmation(this.activeConfirmation);
  }

  async confirmActive(): Promise<void> {
    const candidate = this.activeCandidate();
    if (!candidate || !this.activeEligibility()?.allowed) return;
    await this.runAction(async isCurrent => {
      await this.actions.setActiveAnalysis(candidate.analysis.guid);
      if (isCurrent()) this.dismissActiveConfirmation();
    });
  }

  requestDelete(card: FacilityAnalysisCard): void {
    if (!this.canAct()) return;
    this.clearComparison(); this.detailsGuid.set(undefined); this.createOpen.set(false);
    this.actionError.set(undefined);
    this.deleteCandidate.set(card);
    this.confirmationKind = 'delete';
    this.showConfirmation(this.deleteConfirmation);
  }

  async confirmDelete(): Promise<void> {
    const candidate = this.deleteCandidate();
    if (!candidate || candidate.linkedReports.length || candidate.bankingConsumers.length) return;
    await this.runAction(async isCurrent => {
      await this.actions.deleteAnalysis(candidate.analysis.guid);
      if (!isCurrent()) return;
      this.dismissDeleteConfirmation();
      this.detailsGuid.set(undefined);

    });
  }

  openComparison(card?: FacilityAnalysisCard): void {
    if (this.saving() || !this.comparisonContext()) return;
    this.detailsGuid.set(undefined); this.createOpen.set(false);
    this.dismissActiveConfirmation(); this.dismissDeleteConfirmation();
    this.comparison.open(this.comparisonPanel, this.viewContainerRef, card ? `facility:${card.analysis.guid}` : undefined);
  }
  openDetails(card: FacilityAnalysisCard): void { this.clearComparison(); this.detailsGuid.set(card.analysis.guid); }
  clearComparison(): void { this.comparison.close(); }
  cancelActiveConfirmation(): void {
    if (!this.saving()) this.dismissActiveConfirmation();
  }

  cancelDeleteConfirmation(): void {
    if (!this.saving()) this.dismissDeleteConfirmation();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearComparison();
    if (this.confirmationKind) this.hideOwnedConfirmation();
  }

  private openAnalysisGuid(guid: string): void {
    const facility = this.workspace.facility();
    if (facility) void this.navigateRoute(this.navigation.facilityAnalysisWorkbenchRoute(facility.guid, guid));
  }

  private dismissActiveConfirmation(): void {
    this.activeCandidate.set(undefined);
    this.hideConfirmation('active');
  }

  private dismissDeleteConfirmation(): void {
    this.deleteCandidate.set(undefined);
    this.hideConfirmation('delete');
  }

  private hideConfirmation(kind: 'active' | 'delete'): void {
    if (this.confirmationKind !== kind) return;
    this.confirmationKind = undefined;
    this.hideOwnedConfirmation();
  }

  private showConfirmation(template: TemplateRef<unknown>): void {
    this.confirmationPortal = new TemplatePortal(template, this.viewContainerRef); this.modalPortal.show(this.confirmationPortal);
  }
  private hideOwnedConfirmation(): void {
    if (this.confirmationPortal && this.modalPortal.activePortal() === this.confirmationPortal) this.modalPortal.hide();
    this.confirmationPortal = undefined;
  }
  private async runAction(action: (isCurrent: () => boolean) => Promise<void>): Promise<void> {
    if (!this.canAct()) return;
    const context = JSON.stringify(this.browseKey());
    const isCurrent = () => !this.destroyed && JSON.stringify(this.browseKey()) === context;
    this.saving.set(true);
    this.actionError.set(undefined);
    try { await action(isCurrent); }
    catch (error) { if (isCurrent()) this.actionError.set(error instanceof Error ? error.message : 'The analysis change could not be saved.'); }
    finally { this.saving.set(false); }
  }

}

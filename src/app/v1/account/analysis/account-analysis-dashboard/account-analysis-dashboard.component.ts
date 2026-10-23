import { AnalysisComparisonState, AnalysisComparisonOption } from '@app/v1/shared/analysis-comparison/analysis-comparison-state';
import { AnalysisComparisonSheetComponent } from '@app/v1/shared/analysis-comparison/analysis-comparison-sheet/analysis-comparison-sheet.component';
import { InventoryChartDockComponent } from '@app/v1/shared/charts/inventory-chart-dock/inventory-chart-dock.component';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateModule } from '@app/v1/shared/data-empty-state/data-empty-state.module';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { analysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { InventoryGridComponent } from '@app/v1/shared/inventory/inventory-grid/inventory-grid.component';
import { InventoryTileActionRequest, InventoryTileMenuAction } from '@app/v1/shared/inventory/inventory.models';
import { BrowseFilters, BrowseKey, rememberBrowseForm } from '@app/v1/shared/navigation/browse-state/browse-state.service';
import { BrowsePositionDirective } from '@app/v1/shared/navigation/browse-state/browse-position.directive';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { PageIdentityComponent } from '@app/v1/shared/page-identity/page-identity.component';
import { PortfolioInventoryState } from '@app/v1/account/data/portfolio/portfolio-inventory-state';
import { FacilityAnalysisActionsService } from '@app/v1/facility/analysis/facility-analysis-dashboard/facility-analysis-actions.service';
import { AnalysisDetailsSlideoutComponent } from '@app/v1/facility/analysis/facility-analysis-dashboard/analysis-details-slideout/analysis-details-slideout.component';
import { FacilityAnalysisComparisonComponent } from '@app/v1/facility/analysis/facility-analysis-dashboard/facility-analysis-comparison/facility-analysis-comparison.component';
import { AccountAnalysisWorkspaceService } from './account-analysis-workspace.service';
import { AccountAnalysisActionsService } from './account-analysis-actions.service';
import { AccountAnalysisDashboardResultsService } from './account-analysis-dashboard-results.service';
import { AccountAnalysisDashboardCard } from './account-analysis.models';
import { AccountAnalysisDraftSlideoutComponent, AnalysisDraftFacility, AnalysisDraftRequest } from './account-analysis-draft-slideout/account-analysis-draft-slideout.component';
import { AccountAnalysisComparisonComponent } from './account-analysis-comparison/account-analysis-comparison.component';
import { AnalysisInventoryEntry, AnalysisInventoryResultEntry, analysisInventoryTile, filterAnalysisInventory } from '@app/v1/shared/analysis-inventory/analysis-inventory.models';

@Component({
  selector: 'app-account-analysis-dashboard', host: { class: 'v1-analysis-dashboard-host v1-inventory-dashboard-host' }, standalone: true,
  imports: [AnalysisComparisonSheetComponent, InventoryChartDockComponent, IconComponent, DataEmptyStateModule, WorkspaceSlideoutComponent, ConfirmationDialogComponent, InventoryGridComponent,
    AccountAnalysisDraftSlideoutComponent, AccountAnalysisComparisonComponent, AnalysisDetailsSlideoutComponent,
    FacilityAnalysisComparisonComponent, ReactiveFormsModule, BrowsePositionDirective, BrowseHeaderDirective, PageIdentityComponent],
  providers: [AccountAnalysisDashboardResultsService],
  templateUrl: './account-analysis-dashboard.component.html', styleUrls: ['../../../shared/analysis-inventory/analysis-inventory.css', './account-analysis-dashboard.component.css']
})
export class AccountAnalysisDashboardComponent implements OnDestroy {
  @ViewChild('comparisonPanel', { static: true }) private comparisonPanel!: TemplateRef<unknown>;
  @ViewChild('activeConfirmation', { static: true }) private activeConfirmation!: TemplateRef<unknown>;
  @ViewChild('deleteConfirmation', { static: true }) private deleteConfirmation!: TemplateRef<unknown>;
  private readonly router = inject(Router);
  private readonly actions = inject(AccountAnalysisActionsService);
  private readonly facilityActions = inject(FacilityAnalysisActionsService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private confirmationPortal?: TemplatePortal;
  private confirmationKind: 'active' | 'delete' | undefined;
  private dashboardAccountGuid: string | undefined;
  readonly workspace = inject(AccountAnalysisWorkspaceService);
  readonly results = inject(AccountAnalysisDashboardResultsService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    scope: new FormControl<BrowseFilters['analyses']['scope']>('all', { nonNullable: true }),
    category: new FormControl<BrowseFilters['analyses']['category']>('all', { nonNullable: true }),
    status: new FormControl<BrowseFilters['analyses']['status']>('all', { nonNullable: true }),
    sort: new FormControl<BrowseFilters['analyses']['sort']>('account-first', { nonNullable: true })
  });
  readonly browseKey = computed<BrowseKey<'analyses'> | undefined>(() => {
    const account = this.workspace.account();
    return account && this.workspace.workspaceState() === 'ready' && account.guid === this.navigation.routeState().accountGuid
      ? { kind: 'analyses', accountGuid: account.guid } : undefined;
  });
  private readonly rememberedFilters = rememberBrowseForm(this.browseKey, this.filtersForm);
  readonly showCategory = computed(() => this.workspace.categories().length > 1);
  // A remembered category must never silently filter a dashboard with no category control.
  readonly filters = computed(() => this.showCategory() ? this.rememberedFilters() : { ...this.rememberedFilters(), category: 'all' as const });
  readonly entries = this.workspace.entries;
  readonly comparisonOptions = computed<readonly AnalysisComparisonOption[]>(() => this.entries().map(entry => ({
    key: entry.key, scope: entry.scope, category: entry.card.category, facilityGuid: entry.scope === 'facility' ? entry.facility.guid : undefined,
    label: `${entry.card.analysis.name || 'Untitled analysis'} · ${entry.scope === 'account' ? 'Account analysis' : 'Facility analysis · ' + entry.ownerName}${this.showCategory() ? ' · ' + (entry.card.category === 'water' ? 'Water' : 'Energy') : ''}`
  })));
  readonly comparison = new AnalysisComparisonState(this.comparisonOptions, computed(() => this.browseKey()?.accountGuid));
  readonly filteredEntries = computed(() => filterAnalysisInventory(this.entries(), this.filters()));
  private readonly baseTiles = computed(() => this.filteredEntries().map(entry => analysisInventoryTile(entry, undefined, this.workspace.meterGroups(), this.navigation, this.workspace.account()?.guid ?? '', this.workspace.statusState(), this.showCategory())));
  readonly inventory = new PortfolioInventoryState(this.browseKey, this.baseTiles, computed(() => this.entries().map(entry => entry.key)), this.filters, this.workspace.canWrite);
  readonly visibleTiles = computed(() => this.inventory.visibleTiles().map(tile => this.tile(this.entries().find(entry => entry.key === tile.guid)!)));
  readonly printTiles = computed(() => this.filteredEntries().map(entry => this.tile(entry)));
  readonly detailsGuid = signal<string | undefined>(undefined);
  readonly comparisonGuids = this.comparison.selectedKeys;
  private readonly activeKey = signal<string | undefined>(undefined);
  private readonly deleteKey = signal<string | undefined>(undefined);
  readonly activeCandidate = computed(() => this.entries().find(entry => entry.key === this.activeKey()));
  readonly deleteCandidate = computed(() => this.entries().find(entry => entry.key === this.deleteKey()));
  readonly resultDemand = computed(() => {
    const keys = new Set([...this.comparisonGuids(), this.detailsGuid()]);
    const overrides = this.inventory.overrides();
    this.inventory.visibleTiles().forEach(tile => { if ((overrides[tile.guid] ?? this.inventory.detail()) !== 'simple') keys.add(tile.guid); });
    return this.browseKey() ? this.entries().filter(entry => keys.has(entry.key)) : [];
  });
  readonly browseReady = computed(() => !!this.browseKey() && this.inventory.ready() && !['idle', 'evaluating'].includes(this.workspace.statusState())
    && this.resultDemand().every(entry => this.results.states()[entry.key]?.state !== 'loading' && !!this.results.states()[entry.key]));
  readonly resultEntries = computed<readonly AnalysisInventoryResultEntry[]>(() => this.entries().map(entry => {
    const outcome = this.results.states()[entry.key] ?? { state: 'loading' as const, message: 'Results not loaded' };
    return { ...entry, outcome, outcomeDisplay: analysisOutcomeDisplay(outcome, entry.card.category) };
  }));
  readonly detailsEntry = computed(() => this.resultEntries().find(entry => entry.key === this.detailsGuid()));
  readonly comparisonEntries = computed(() => this.comparison.complete() ? this.comparisonGuids().map(key => this.resultEntries().find(entry => entry.key === key)!).filter(Boolean) : []);
  readonly accountComparisonCards = computed<readonly AccountAnalysisDashboardCard[]>(() => this.comparisonEntries().flatMap(entry => entry.scope === 'account' ? [{ ...entry.card, outcome: entry.outcome, outcomeDisplay: entry.outcomeDisplay }] : []));
  readonly facilityComparison = computed(() => {
    const selected = this.comparisonEntries().filter(entry => entry.scope === 'facility');
    if (selected.length !== 2 || selected[0].scope !== 'facility') return undefined;
    const facility = selected[0].facility;
    return { facility, cards: selected.map(entry => ({ ...entry.card, outcome: entry.outcome, outcomeDisplay: entry.outcomeDisplay })),
      meterGroups: this.workspace.meterGroups().filter(group => group.facilityId === facility.guid),
      analyses: this.workspace.facilityAnalyses().filter(analysis => analysis.facilityId === facility.guid) };
  });
  readonly menuActions = computed<Readonly<Record<string, readonly InventoryTileMenuAction[]>>>(() => Object.fromEntries(this.entries().map(entry => {
    return [entry.key, [
      { id: 'details', label: 'View analysis details', icon: 'monocle' },
      { id: 'compare', label: 'Compare', icon: 'analysis' },
      ...(!entry.card.isActiveForReporting ? [{ id: 'active', label: `Set active for ${entry.scope} reporting`, icon: 'target', disabled: !this.canAct() }] : []),
      { id: 'copy', label: 'Copy analysis', icon: 'copy', disabled: !this.canAct() },
      { id: 'delete', label: 'Delete analysis', icon: 'delete', disabled: !this.canAct() }
    ] as InventoryTileMenuAction[]];
  })));
  readonly breadcrumbs = computed(() => [{ label: this.workspace.account()?.name || 'Account' }, { label: 'Analysis' }]);
  readonly title = computed(() => `${this.workspace.account()?.name || 'Account'} Analysis`);
  readonly countLabel = computed(() => {
    const entries = this.filteredEntries();
    return `${entries.length} of ${this.entries().length} analyses · ${entries.filter(entry => entry.scope === 'account').length} account · ${entries.filter(entry => entry.scope === 'facility').length} facility`;
  });
  readonly createOpen = signal(false);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving() && !!this.browseKey());
  readonly energyAvailable = computed(() => this.actions.categoryAvailable('energy'));
  readonly waterAvailable = computed(() => this.actions.categoryAvailable('water'));
  readonly creationFacilities = computed<readonly AnalysisDraftFacility[]>(() => this.workspace.facilities().map(facility => ({
    guid: facility.guid, name: facility.name || 'Untitled facility',
    energyAvailable: this.facilityActions.categoryAvailable('energy', facility.guid),
    waterAvailable: this.facilityActions.categoryAvailable('water', facility.guid)
  })).sort((first, second) => first.name.localeCompare(second.name) || first.guid.localeCompare(second.guid)));
  readonly activeEligibility = computed(() => {
    const entry = this.activeCandidate();
    return !entry ? undefined : entry.scope === 'account' ? this.actions.activeEligibility(entry.card.analysis) : this.facilityActions.activeEligibility(entry.card.analysis, entry.facility.guid);
  });
  readonly activeReplacement = computed(() => {
    const entry = this.activeCandidate();
    if (!entry) return undefined;
    return this.entries().find(other => other.key !== entry.key && other.scope === entry.scope && other.card.category === entry.card.category
      && other.card.isActiveForReporting && (entry.scope === 'account' || (other.scope === 'facility' && other.facility.guid === entry.facility.guid)));
  });
  readonly deleteBlockedReason = computed(() => {
    const entry = this.deleteCandidate();
    if (!entry) return '';
    if (entry.card.linkedReports.length) return `Remove this analysis from ${entry.card.linkedReports.length} linked ${entry.scope} report(s) before deleting it.`;
    return entry.scope === 'facility' && entry.card.bankingConsumers.length ? `Remove this analysis from ${entry.card.bankingConsumers.length} banking workflow(s) before deleting it.` : '';
  });

  constructor() {
    effect(() => this.results.setDemand(this.resultDemand()));
    effect(() => {
      const accountGuid = this.browseKey()?.accountGuid;
      if (accountGuid === this.dashboardAccountGuid) return;
      this.dashboardAccountGuid = accountGuid;
      this.resetTransientState();
    });
  }

  private tile(entry: AnalysisInventoryEntry) {
    return analysisInventoryTile(entry, this.results.states()[entry.key], this.workspace.meterGroups(), this.navigation, this.workspace.account()?.guid ?? '', this.workspace.statusState(), this.showCategory());
  }
  clearFilters(): void { this.filtersForm.reset({ search: '', scope: 'all', category: 'all', status: 'all', sort: 'account-first' }); }
  async navigateRoute(route: readonly string[]): Promise<void> {
    try { await this.router.navigate([...route]); }
    catch { this.actionError.set('The analysis could not be opened. Please try again.'); }
  }
  open(entry: AnalysisInventoryEntry): void { void this.navigateRoute(this.tile(entry).route); }
  openCreate(): void { if (this.canAct()) { this.clearComparison(); this.detailsGuid.set(undefined); this.actionError.set(undefined); this.createOpen.set(true); } }
  closeCreate(): void { if (!this.saving()) this.createOpen.set(false); }
  async create(request: AnalysisDraftRequest): Promise<void> {
    await this.runAction(async isCurrent => {
      const analysis = request.scope === 'account'
        ? await this.actions.createAnalysis(request.category)
        : await this.facilityActions.createAnalysis(request.category, request.facilityGuid);
      if (!isCurrent()) return;
      this.createOpen.set(false);
      await this.navigateRoute(request.scope === 'account'
        ? this.navigation.accountAnalysisWorkbenchRoute(analysis.accountId, analysis.guid)
        : this.navigation.facilityAnalysisWorkbenchRoute(request.facilityGuid, analysis.guid));
    });
  }
  async copy(entry: AnalysisInventoryEntry): Promise<void> {
    await this.runAction(async isCurrent => {
      if (entry.scope === 'account') {
        const copy = await this.actions.copyAnalysis(entry.card.analysis.guid);
        if (isCurrent()) await this.navigateRoute(this.navigation.accountAnalysisWorkbenchRoute(copy.accountId, copy.guid));
      } else {
        const copy = await this.facilityActions.copyAnalysis(entry.card.analysis.guid, entry.facility.guid);
        if (isCurrent()) await this.navigateRoute(this.navigation.facilityAnalysisWorkbenchRoute(entry.facility.guid, copy.guid));
      }
    });
  }
  requestAction(request: InventoryTileActionRequest): void {
    const entry = this.entries().find(item => item.key === request.guid);
    if (!entry) return;
    if (request.action === 'details') { this.clearComparison(); this.createOpen.set(false); this.detailsGuid.set(entry.key); }
    if (request.action === 'compare') this.openComparison(entry);
    if (request.action === 'copy') void this.copy(entry);
    if (request.action === 'active') this.requestActive(entry);
    if (request.action === 'delete') this.requestDelete(entry);
  }
  requestActive(entry: AnalysisInventoryEntry): void {
    if (!this.canAct()) return;
    this.clearComparison(); this.detailsGuid.set(undefined); this.createOpen.set(false);
    this.actionError.set(undefined); this.activeKey.set(entry.key); this.confirmationKind = 'active';
    this.showConfirmation(this.activeConfirmation);
  }
  async confirmActive(): Promise<void> {
    const entry = this.activeCandidate();
    if (!entry || !this.activeEligibility()?.allowed) return;
    await this.runAction(async () => {
      if (entry.scope === 'account') await this.actions.setActiveAnalysis(entry.card.analysis.guid);
      else await this.facilityActions.setActiveAnalysis(entry.card.analysis.guid, entry.facility.guid);
      this.dismissActiveConfirmation();
    });
  }
  requestDelete(entry: AnalysisInventoryEntry): void {
    if (!this.canAct()) return;
    this.clearComparison(); this.detailsGuid.set(undefined); this.createOpen.set(false);
    this.actionError.set(undefined); this.deleteKey.set(entry.key); this.confirmationKind = 'delete';
    this.showConfirmation(this.deleteConfirmation);
  }
  async confirmDelete(): Promise<void> {
    const entry = this.deleteCandidate();
    if (!entry || this.deleteBlockedReason()) return;
    await this.runAction(async () => {
      if (entry.scope === 'account') await this.actions.deleteAnalysis(entry.card.analysis.guid);
      else await this.facilityActions.deleteAnalysis(entry.card.analysis.guid, entry.facility.guid);
      this.dismissDeleteConfirmation(); this.detailsGuid.set(undefined);

    });
  }
  openComparison(entry?: AnalysisInventoryEntry): void {
    if (this.saving() || !this.browseKey()) return;
    this.detailsGuid.set(undefined); this.createOpen.set(false);
    this.dismissActiveConfirmation(); this.dismissDeleteConfirmation();
    this.comparison.open(this.comparisonPanel, this.viewContainerRef, entry?.key);
  }
  clearComparison(): void { this.comparison.close(); }
  cancelActiveConfirmation(): void { if (!this.saving()) this.dismissActiveConfirmation(); }
  cancelDeleteConfirmation(): void { if (!this.saving()) this.dismissDeleteConfirmation(); }
  private dismissActiveConfirmation(): void { this.activeKey.set(undefined); this.hideConfirmation('active'); }
  private dismissDeleteConfirmation(): void { this.deleteKey.set(undefined); this.hideConfirmation('delete'); }
  private hideConfirmation(kind: 'active' | 'delete'): void { if (this.confirmationKind === kind) { this.confirmationKind = undefined; this.hideOwnedConfirmation(); } }
  private resetTransientState(): void {
    this.detailsGuid.set(undefined); this.createOpen.set(false); this.actionError.set(undefined); this.activeKey.set(undefined); this.deleteKey.set(undefined); this.clearComparison();
    if (this.confirmationKind) { this.confirmationKind = undefined; this.hideOwnedConfirmation(); }
  }
  ngOnDestroy(): void { this.clearComparison(); if (this.confirmationKind) this.hideOwnedConfirmation(); }
  private showConfirmation(template: TemplateRef<unknown>): void {
    this.confirmationPortal = new TemplatePortal(template, this.viewContainerRef); this.modalPortal.show(this.confirmationPortal);
  }
  private hideOwnedConfirmation(): void {
    if (this.confirmationPortal && this.modalPortal.activePortal() === this.confirmationPortal) this.modalPortal.hide();
    this.confirmationPortal = undefined;
  }
  private async runAction(action: (isCurrent: () => boolean) => Promise<void>): Promise<void> {
    if (!this.canAct()) return;
    const accountGuid = this.dashboardAccountGuid;
    this.saving.set(true); this.actionError.set(undefined);
    try { await action(() => accountGuid === this.dashboardAccountGuid); }
    catch (error) { if (this.dashboardAccountGuid === accountGuid) this.actionError.set(error instanceof Error ? error.message : 'The analysis change could not be saved.'); }
    finally { this.saving.set(false); }
  }
}

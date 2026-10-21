import { AnalysisComparisonState, AnalysisComparisonOption } from '@app/v1/shared/analysis-comparison/analysis-comparison-state';
import { AnalysisComparisonSheetComponent } from '@app/v1/shared/analysis-comparison/analysis-comparison-sheet/analysis-comparison-sheet.component';
import { InventoryChartDockComponent } from '@app/v1/shared/charts/inventory-chart-dock/inventory-chart-dock.component';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateModule } from '@app/v1/shared/data-empty-state/data-empty-state.module';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AnalysisBrowseCardComponent } from './analysis-browse-card/analysis-browse-card.component';
import { FacilityAnalysisWorkspaceService } from './facility-analysis-workspace.service';
import { FacilityAnalysisCard, FacilityAnalysisDashboardCard } from './facility-analysis.models';
import { AnalysisDraftSlideoutComponent } from './analysis-draft-slideout/analysis-draft-slideout.component';
import { FacilityAnalysisActionsService } from './facility-analysis-actions.service';
import { AnalysisCategory } from '@data/models/analysis';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { FacilityAnalysisDashboardResultsService } from './facility-analysis-dashboard-results.service';
import { facilityAnalysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { FacilityAnalysisComparisonComponent } from './facility-analysis-comparison/facility-analysis-comparison.component';
import { ActiveSummaryCardComponent } from '@app/v1/shared/analysis-results/active-summary-card/active-summary-card.component';
import { AnalysisDetailsSlideoutComponent } from './analysis-details-slideout/analysis-details-slideout.component';

type AnalysisCategoryFilter = 'all' | 'energy' | 'water';
type AnalysisStatusFilter = 'all' | 'ready' | 'warning' | 'error' | 'active';
type AnalysisSort = 'attention' | 'modified' | 'name' | 'baseline';

@Component({
  selector: 'app-facility-analysis-dashboard',
  host: { class: 'v1-analysis-dashboard-host' },
  standalone: true,
  imports: [AnalysisComparisonSheetComponent, InventoryChartDockComponent, IconComponent, DataEmptyStateModule, AnalysisBrowseCardComponent, AnalysisDraftSlideoutComponent, ConfirmationDialogComponent, ReactiveFormsModule, FacilityAnalysisComparisonComponent, ActiveSummaryCardComponent, AnalysisDetailsSlideoutComponent],
  providers: [FacilityAnalysisDashboardResultsService],
  templateUrl: './facility-analysis-dashboard.component.html',
  styleUrls: ['./facility-analysis-dashboard.component.css']
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
    category: new FormControl<AnalysisCategoryFilter>('all', { nonNullable: true }),
    status: new FormControl<AnalysisStatusFilter>('all', { nonNullable: true }),
    sort: new FormControl<AnalysisSort>('attention', { nonNullable: true })
  });
  readonly filters = toSignal(this.filtersForm.valueChanges, { initialValue: this.filtersForm.getRawValue() });
  readonly cards = computed<readonly FacilityAnalysisDashboardCard[]>(() => this.workspace.cards().map(card => {
    const outcome = this.results.states()[card.analysis.guid]
      ?? { state: 'loading' as const, message: 'Preparing data…' };
    return { ...card, outcome, outcomeDisplay: facilityAnalysisOutcomeDisplay(outcome, card.category) };
  }));
  readonly detailsGuid = signal<string | undefined>(undefined);
  readonly detailsCard = computed(() => this.cards().find(card => card.analysis.guid === this.detailsGuid()));
  readonly activeReportingCards = computed(() => this.cards().filter(card => card.isActiveForReporting));
  readonly showGroupDetails = signal(false);
  readonly createOpen = signal(false);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly activeCandidate = signal<FacilityAnalysisCard | undefined>(undefined);
  readonly deleteCandidate = signal<FacilityAnalysisCard | undefined>(undefined);
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly energyAvailable = computed(() => this.actions.categoryAvailable('energy'));
  readonly waterAvailable = computed(() => this.actions.categoryAvailable('water'));
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
    const showCategory = new Set(this.workspace.cards().map(card => card.category)).size > 1;
    return this.workspace.cards().map(card => ({ key: `facility:${card.analysis.guid}`, scope: 'facility', category: card.category,
      facilityGuid: this.workspace.facility()?.guid, label: `${card.analysis.name || 'Untitled analysis'} · Facility analysis · ${this.workspace.facility()?.name || 'Facility'}${showCategory ? ' · ' + (card.category === 'water' ? 'Water' : 'Energy') : ''}` }));
  });
  readonly comparisonContext = computed(() => this.workspace.workspaceState() === 'ready' && this.workspace.facility()
    ? `${this.workspace.account()?.guid}:${this.workspace.facility()!.guid}` : undefined);
  readonly comparison = new AnalysisComparisonState(this.comparisonOptions, this.comparisonContext);
  readonly comparisonGuids = this.comparison.selectedKeys;
  readonly comparisonCards = computed(() => this.comparison.complete() ? this.comparisonGuids()
    .map(key => this.cards().find(card => `facility:${card.analysis.guid}` === key)!)
    .filter(Boolean) : []);
  readonly filteredCards = computed(() => {
    const filters = this.filters();
    const search = filters.search.trim().toLocaleLowerCase();
    const category = filters.category;
    const status = filters.status;
    return this.cards()
      .filter(card => !search || card.searchText.includes(search))
      .filter(card => category === 'all' || card.category === category)
      .filter(card => status === 'all' || (status === 'active' ? card.isActiveForReporting : card.status === status))
      .sort((first, second) => this.compareCards(first, second));
  });

  open(card: FacilityAnalysisCard): void {
    const facility = this.workspace.facility();
    if (facility) void this.router.navigate(this.navigation.facilityAnalysisWorkbenchRoute(facility.guid, card.analysis.guid));
  }

  openCreate(): void { if (this.canAct()) { this.clearComparison(); this.detailsGuid.set(undefined); this.actionError.set(undefined); this.createOpen.set(true); } }
  closeCreate(): void { if (!this.saving()) this.createOpen.set(false); }

  async create(category: AnalysisCategory): Promise<void> {
    await this.runAction(async () => {
      const analysis = await this.actions.createAnalysis(category);
      this.createOpen.set(false);
      this.openAnalysisGuid(analysis.guid);
    });
  }

  async copy(card: FacilityAnalysisCard): Promise<void> {
    await this.runAction(async () => this.openAnalysisGuid((await this.actions.copyAnalysis(card.analysis.guid)).guid));
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
    await this.runAction(async () => {
      await this.actions.setActiveAnalysis(candidate.analysis.guid);
      this.dismissActiveConfirmation();
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
    await this.runAction(async () => {
      await this.actions.deleteAnalysis(candidate.analysis.guid);
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
  toggleGroupDetails(): void { this.showGroupDetails.update(visible => !visible); }
  cancelActiveConfirmation(): void {
    if (!this.saving()) this.dismissActiveConfirmation();
  }

  cancelDeleteConfirmation(): void {
    if (!this.saving()) this.dismissDeleteConfirmation();
  }

  ngOnDestroy(): void {
    this.clearComparison();
    if (this.confirmationKind) this.hideOwnedConfirmation();
  }

  private openAnalysisGuid(guid: string): void {
    const facility = this.workspace.facility();
    if (facility) void this.router.navigate(this.navigation.facilityAnalysisWorkbenchRoute(facility.guid, guid));
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
  private async runAction(action: () => Promise<void>): Promise<void> {
    if (!this.canAct()) return;
    this.saving.set(true);
    this.actionError.set(undefined);
    try { await action(); }
    catch (error) { this.actionError.set(error instanceof Error ? error.message : 'The analysis change could not be saved.'); }
    finally { this.saving.set(false); }
  }

  private compareCards(first: FacilityAnalysisCard, second: FacilityAnalysisCard): number {
    if (this.filters().sort === 'modified') return second.modifiedSortValue - first.modifiedSortValue || compareName(first, second);
    if (this.filters().sort === 'name') return compareName(first, second);
    if (this.filters().sort === 'baseline') return (first.analysis.baselineYear ?? Infinity) - (second.analysis.baselineYear ?? Infinity) || compareName(first, second);
    return first.attentionRank - second.attentionRank || compareName(first, second);
  }
}

function compareName(first: FacilityAnalysisCard, second: FacilityAnalysisCard): number { return first.analysis.name.localeCompare(second.analysis.name); }

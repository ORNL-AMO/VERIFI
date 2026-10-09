import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateModule } from '@app/v1/shared/data-empty-state/data-empty-state.module';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
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
import { facilityAnalysisOutcomeDisplay } from '../facility-analysis-outcome-summary';
import { FacilityAnalysisGroupModelRosterComponent } from '../group-model-roster/facility-analysis-group-model-roster.component';
import { AnalysisComparisonSlideoutComponent } from './analysis-comparison-slideout/analysis-comparison-slideout.component';

type AnalysisCategoryFilter = 'all' | 'energy' | 'water';
type AnalysisStatusFilter = 'all' | 'ready' | 'warning' | 'error' | 'active';
type AnalysisSort = 'attention' | 'modified' | 'name' | 'baseline';

@Component({
  selector: 'app-facility-analysis-dashboard',
  standalone: true,
  imports: [IconComponent, DataEmptyStateModule, WorkspaceSlideoutComponent, AnalysisBrowseCardComponent, AnalysisDraftSlideoutComponent, ConfirmationDialogComponent, ReactiveFormsModule, FacilityAnalysisGroupModelRosterComponent, AnalysisComparisonSlideoutComponent],
  providers: [FacilityAnalysisDashboardResultsService],
  templateUrl: './facility-analysis-dashboard.component.html',
  styleUrls: ['./facility-analysis-dashboard.component.css']
})
export class FacilityAnalysisDashboardComponent implements OnDestroy {
  @ViewChild('activeConfirmation', { static: true }) private activeConfirmation!: TemplateRef<unknown>;
  @ViewChild('deleteConfirmation', { static: true }) private deleteConfirmation!: TemplateRef<unknown>;

  private readonly router = inject(Router);
  private readonly actions = inject(FacilityAnalysisActionsService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
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
  readonly comparisonGuids = signal<readonly string[]>([]);
  readonly comparisonCards = computed(() => this.comparisonGuids()
    .map(guid => this.cards().find(card => card.analysis.guid === guid))
    .filter((card): card is FacilityAnalysisDashboardCard => !!card));
  readonly comparisonCategory = computed(() => this.comparisonCards()[0]?.category);
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

  openCreate(): void { if (this.canAct()) { this.actionError.set(undefined); this.createOpen.set(true); } }
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
    this.actionError.set(undefined);
    this.activeCandidate.set(card);
    this.confirmationKind = 'active';
    this.modalPortal.show(new TemplatePortal(this.activeConfirmation, this.viewContainerRef));
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
    this.actionError.set(undefined);
    this.deleteCandidate.set(card);
    this.confirmationKind = 'delete';
    this.modalPortal.show(new TemplatePortal(this.deleteConfirmation, this.viewContainerRef));
  }

  async confirmDelete(): Promise<void> {
    const candidate = this.deleteCandidate();
    if (!candidate || candidate.linkedReports.length || candidate.bankingConsumers.length) return;
    await this.runAction(async () => {
      await this.actions.deleteAnalysis(candidate.analysis.guid);
      this.dismissDeleteConfirmation();
      this.detailsGuid.set(undefined);
      this.comparisonGuids.update(guids => guids.filter(guid => guid !== candidate.analysis.guid));
    });
  }

  toggleComparison(card: FacilityAnalysisCard): void {
    const current = this.comparisonGuids();
    if (current.includes(card.analysis.guid)) {
      this.comparisonGuids.set(current.filter(guid => guid !== card.analysis.guid));
      return;
    }
    const category = this.comparisonCategory();
    if (category && card.category !== category) return;
    this.comparisonGuids.set([...current, card.analysis.guid].slice(-2));
  }

  isCompared(guid: string): boolean { return this.comparisonGuids().includes(guid); }
  comparisonDisabledReason(card: FacilityAnalysisCard): string | undefined {
    const category = this.comparisonCategory();
    if (!category || category === card.category || this.isCompared(card.analysis.guid)) return undefined;
    return `Compare with another ${category} analysis`;
  }
  clearComparison(): void { this.comparisonGuids.set([]); }
  toggleGroupDetails(): void { this.showGroupDetails.update(visible => !visible); }
  cancelActiveConfirmation(): void {
    if (!this.saving()) this.dismissActiveConfirmation();
  }

  cancelDeleteConfirmation(): void {
    if (!this.saving()) this.dismissDeleteConfirmation();
  }

  ngOnDestroy(): void {
    if (this.confirmationKind) this.modalPortal.hide();
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
    this.modalPortal.hide();
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

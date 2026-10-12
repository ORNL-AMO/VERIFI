import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AnalysisCategory } from '@data/models/analysis';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateModule } from '@app/v1/shared/data-empty-state/data-empty-state.module';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { ActiveSummaryCardComponent } from '@app/v1/shared/analysis-results/active-summary-card/active-summary-card.component';
import { analysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisWorkspaceService } from './account-analysis-workspace.service';
import { AccountAnalysisActionsService } from './account-analysis-actions.service';
import { AccountAnalysisDashboardResultsService } from './account-analysis-dashboard-results.service';
import {
  AccountAnalysisCard,
  AccountAnalysisDashboardCard,
  filterAndSortAccountAnalysisCards
} from './account-analysis.models';
import { AccountAnalysisBrowseCardComponent } from './account-analysis-browse-card/account-analysis-browse-card.component';
import { AccountAnalysisDraftSlideoutComponent } from './account-analysis-draft-slideout/account-analysis-draft-slideout.component';

type AnalysisCategoryFilter = 'all' | AnalysisCategory;
type AnalysisStatusFilter = 'all' | 'ready' | 'warning' | 'error' | 'active';
type AnalysisSort = 'attention' | 'modified' | 'name' | 'baseline';

@Component({
  selector: 'app-account-analysis-dashboard',
  standalone: true,
  imports: [
    IconComponent,
    DataEmptyStateModule,
    WorkspaceSlideoutComponent,
    ConfirmationDialogComponent,
    ActiveSummaryCardComponent,
    AccountAnalysisBrowseCardComponent,
    AccountAnalysisDraftSlideoutComponent,
    ReactiveFormsModule
  ],
  providers: [AccountAnalysisDashboardResultsService],
  templateUrl: './account-analysis-dashboard.component.html',
  styleUrls: ['./account-analysis-dashboard.component.css']
})
export class AccountAnalysisDashboardComponent implements OnDestroy {
  @ViewChild('activeConfirmation', { static: true }) private activeConfirmation!: TemplateRef<unknown>;
  @ViewChild('deleteConfirmation', { static: true }) private deleteConfirmation!: TemplateRef<unknown>;

  private readonly router = inject(Router);
  private readonly actions = inject(AccountAnalysisActionsService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private confirmationKind: 'active' | 'delete' | undefined;
  readonly workspace = inject(AccountAnalysisWorkspaceService);
  readonly results = inject(AccountAnalysisDashboardResultsService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    category: new FormControl<AnalysisCategoryFilter>('all', { nonNullable: true }),
    status: new FormControl<AnalysisStatusFilter>('all', { nonNullable: true }),
    sort: new FormControl<AnalysisSort>('attention', { nonNullable: true })
  });
  readonly filters = toSignal(this.filtersForm.valueChanges, { initialValue: this.filtersForm.getRawValue() });
  readonly cards = computed<readonly AccountAnalysisDashboardCard[]>(() => this.workspace.cards().map(card => {
    const outcome = this.results.states()[card.analysis.guid]
      ?? { state: 'loading' as const, message: 'Preparing data…' };
    return { ...card, outcome, outcomeDisplay: analysisOutcomeDisplay(outcome, card.category) };
  }));
  readonly filteredCards = computed(() => {
    const filters = this.filters();
    return filterAndSortAccountAnalysisCards(this.cards(), {
      search: filters.search ?? '',
      category: filters.category ?? 'all',
      status: filters.status ?? 'all',
      sort: filters.sort ?? 'attention'
    });
  });
  readonly activeReportingCards = computed(() => this.cards().filter(card => card.isActiveForReporting));
  readonly detailsGuid = signal<string | undefined>(undefined);
  readonly detailsCard = computed(() => this.cards().find(card => card.analysis.guid === this.detailsGuid()));
  readonly createOpen = signal(false);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly activeCandidate = signal<AccountAnalysisCard | undefined>(undefined);
  readonly deleteCandidate = signal<AccountAnalysisCard | undefined>(undefined);
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly energyAvailable = computed(() => this.actions.categoryAvailable('energy'));
  readonly waterAvailable = computed(() => this.actions.categoryAvailable('water'));
  readonly activeEligibility = computed(() => {
    const candidate = this.activeCandidate();
    return candidate ? this.actions.activeEligibility(candidate.analysis) : undefined;
  });
  readonly activeReplacement = computed(() => {
    const candidate = this.activeCandidate();
    const account = this.workspace.account();
    if (!candidate || !account) return undefined;
    const guid = candidate.category === 'water'
      ? account.selectedWaterAnalysisId : account.selectedEnergyAnalysisId;
    return this.cards().find(card => card.analysis.guid === guid);
  });

  open(card: AccountAnalysisCard): void { this.openAnalysisGuid(card.analysis.guid); }
  openCreate(): void { if (this.canAct()) { this.actionError.set(undefined); this.createOpen.set(true); } }
  closeCreate(): void { if (!this.saving()) this.createOpen.set(false); }

  async create(category: AnalysisCategory): Promise<void> {
    await this.runAction(async () => {
      const analysis = await this.actions.createAnalysis(category);
      this.createOpen.set(false);
      this.openAnalysisGuid(analysis.guid);
    });
  }

  async copy(card: AccountAnalysisCard): Promise<void> {
    await this.runAction(async () => this.openAnalysisGuid((await this.actions.copyAnalysis(card.analysis.guid)).guid));
  }

  requestActive(card: AccountAnalysisCard): void {
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

  requestDelete(card: AccountAnalysisCard): void {
    if (!this.canAct()) return;
    this.actionError.set(undefined);
    this.deleteCandidate.set(card);
    this.confirmationKind = 'delete';
    this.modalPortal.show(new TemplatePortal(this.deleteConfirmation, this.viewContainerRef));
  }

  async confirmDelete(): Promise<void> {
    const candidate = this.deleteCandidate();
    if (!candidate || candidate.linkedReports.length) return;
    await this.runAction(async () => {
      await this.actions.deleteAnalysis(candidate.analysis.guid);
      this.dismissDeleteConfirmation();
      this.detailsGuid.set(undefined);
    });
  }

  cancelActiveConfirmation(): void { if (!this.saving()) this.dismissActiveConfirmation(); }
  cancelDeleteConfirmation(): void { if (!this.saving()) this.dismissDeleteConfirmation(); }
  ngOnDestroy(): void { if (this.confirmationKind) this.modalPortal.hide(); }

  private openAnalysisGuid(guid: string): void {
    const account = this.workspace.account();
    if (account) void this.router.navigate(this.navigation.accountAnalysisWorkbenchRoute(account.guid, guid));
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
    catch (error) {
      this.actionError.set(error instanceof Error ? error.message : 'The account-analysis change could not be saved.');
    } finally { this.saving.set(false); }
  }
}

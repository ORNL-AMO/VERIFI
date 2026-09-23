import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { getWeatherSearchFromFacility } from '@shared/sharedHelperFunctions';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PredictorWorkspaceActionsService } from '../predictor-workspace-actions.service';
import {
  FacilityPredictorSort,
  FacilityPredictorStatusFilter,
  FacilityPredictorTypeFilter,
  PredictorCardView,
  PredictorDraft,
  WeatherPredictorGenerationDraft,
  WeatherPredictorGenerationPreview
} from '../models';
import { PredictorWeatherWorkflowService } from '../predictor-weather-workflow.service';
import { PredictorBrowseCardComponent } from './predictor-browse-card/predictor-browse-card.component';
import { PredictorDraftSlideoutComponent } from './predictor-draft-slideout/predictor-draft-slideout.component';

@Component({
  selector: 'app-predictors-dashboard', templateUrl: './predictors-dashboard.component.html',
  styleUrls: ['./predictors-dashboard.component.css'], standalone: true,
  imports: [IconComponent, DataEmptyStateComponent, PredictorBrowseCardComponent, PredictorDraftSlideoutComponent, RouterLink]
})
export class PredictorsDashboardComponent {
  private readonly router = inject(Router);
  private readonly actions = inject(PredictorWorkspaceActionsService);
  readonly weatherWorkflow = inject(PredictorWeatherWorkflowService);
  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly addPredictorOpen = signal(false);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly weatherPreview = signal<WeatherPredictorGenerationPreview | undefined>(undefined);
  readonly search = signal('');
  readonly statusFilter = signal<FacilityPredictorStatusFilter>('all');
  readonly typeFilter = signal<FacilityPredictorTypeFilter>('all');
  readonly sortBy = signal<FacilityPredictorSort>('attention');
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly accountPredictorsRoute = computed(() => {
    const account = this.workspace.account();
    return account ? [...this.navigation.accountDataRoute(account.guid), 'predictors'] : undefined;
  });
  readonly initialStationSearch = computed(() => {
    const facility = this.workspace.facility();
    return facility ? getWeatherSearchFromFacility(facility) : '';
  });
  readonly filteredPredictorCards = computed(() => {
    const search = this.search().trim().toLowerCase();
    return [...this.workspace.predictorCards()]
      .filter(card => !search || card.searchText.includes(search))
      .filter(card => this.matchesStatus(card, this.statusFilter()))
      .filter(card => this.matchesType(card, this.typeFilter()))
      .sort((first, second) => this.compareCards(first, second));
  });

  setSearch(value: string): void { this.search.set(value); }
  setStatusFilter(value: string): void {
    if (['all', 'attention', 'noReadings', 'clear'].includes(value)) this.statusFilter.set(value as FacilityPredictorStatusFilter);
  }
  setTypeFilter(value: string): void {
    if (['all', 'standard', 'weather'].includes(value)) this.typeFilter.set(value as FacilityPredictorTypeFilter);
  }
  setSortBy(value: string): void {
    if (['attention', 'predictorName', 'latestReading'].includes(value)) this.sortBy.set(value as FacilityPredictorSort);
  }
  openAddPredictor(): void {
    if (this.canAct()) { this.actionError.set(undefined); this.addPredictorOpen.set(true); }
  }
  closeAddPredictor(): void {
    if (!this.saving()) {
      this.weatherWorkflow.cancel();
      this.addPredictorOpen.set(false);
      this.weatherPreview.set(undefined);
      this.actionError.set(undefined);
    }
  }
  async savePredictorDraft(draft: PredictorDraft): Promise<void> {
    if (!this.canAct()) return;
    this.saving.set(true);
    this.actionError.set(undefined);
    try {
      const predictor = await this.actions.createPredictor(draft);
      this.addPredictorOpen.set(false);
      const facility = this.workspace.facility();
      if (facility) await this.router.navigate(this.navigation.facilityPredictorRoute(facility.guid, predictor.guid, 'settings'));
    } catch (error) {
      this.actionError.set(error instanceof Error ? error.message : 'The predictor could not be added.');
    } finally { this.saving.set(false); }
  }

  async previewWeatherPredictors(draft: WeatherPredictorGenerationDraft): Promise<void> {
    if (this.saving()) return;
    this.actionError.set(undefined);
    this.weatherPreview.set(undefined);
    const preview = await this.weatherWorkflow.previewGeneration(draft);
    if (preview) this.weatherPreview.set(preview);
  }

  clearWeatherPreview(): void {
    if (this.weatherWorkflow.busy()) return;
    this.weatherPreview.set(undefined);
    this.weatherWorkflow.reset();
  }

  async confirmWeatherPredictors(): Promise<void> {
    const preview = this.weatherPreview();
    if (!preview || this.saving()) return;
    this.saving.set(true);
    this.actionError.set(undefined);
    try {
      const predictors = await this.weatherWorkflow.commitGeneration(preview);
      this.weatherPreview.set(undefined);
      this.addPredictorOpen.set(false);
      const facility = this.workspace.facility();
      if (facility && predictors[0]) {
        await this.router.navigate(this.navigation.facilityPredictorRoute(facility.guid, predictors[0].guid, 'readings'));
      }
    } catch (error) {
      this.actionError.set(error instanceof Error ? error.message : 'The weather predictors could not be created.');
    } finally {
      this.saving.set(false);
    }
  }

  private matchesStatus(card: PredictorCardView, filter: FacilityPredictorStatusFilter): boolean {
    if (filter === 'attention') return card.statusTone === 'danger' || card.statusTone === 'warning';
    if (filter === 'noReadings') return card.readingCount === 0;
    if (filter === 'clear') return card.readingCount > 0 && card.statusTone === 'success';
    return true;
  }
  private matchesType(card: PredictorCardView, filter: FacilityPredictorTypeFilter): boolean {
    if (filter === 'standard') return card.predictor.predictorType === 'Standard';
    if (filter === 'weather') return card.predictor.predictorType === 'Weather';
    return true;
  }
  private compareCards(first: PredictorCardView, second: PredictorCardView): number {
    const nameOrder = (first.predictor.name || '').localeCompare(second.predictor.name || '')
      || first.predictor.guid.localeCompare(second.predictor.guid);
    if (this.sortBy() === 'predictorName') return nameOrder;
    if (this.sortBy() === 'latestReading') return second.latestReadingSortValue - first.latestReadingSortValue || nameOrder;
    return attentionRank(first) - attentionRank(second) || nameOrder;
  }
}

function attentionRank(card: PredictorCardView): number {
  if (card.statusTone === 'danger') return 0;
  if (card.readingCount === 0) return 1;
  if (card.statusTone === 'warning') return 2;
  if (card.statusTone === 'info') return 3;
  return 4;
}

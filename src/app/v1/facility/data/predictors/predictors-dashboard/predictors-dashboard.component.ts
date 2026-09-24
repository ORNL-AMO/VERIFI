import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataEmptyStateComponent } from '@app/v1/shared/data-empty-state/data-empty-state.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { FacilityPredictorsWorkspaceService } from '../facility-predictors-workspace.service';
import { PredictorWorkspaceActionsService } from '../predictor-workspace-actions.service';
import {
  FacilityPredictorSort,
  FacilityPredictorStatusFilter,
  FacilityPredictorTypeFilter,
  PredictorBrowseItem,
  PredictorDraft
} from '../models';
import { PredictorBrowseCardComponent } from './predictor-browse-card/predictor-browse-card.component';
import { PredictorDraftSlideoutComponent } from './predictor-draft-slideout/predictor-draft-slideout.component';
import { WeatherStationBrowseCardComponent } from './weather-station-browse-card/weather-station-browse-card.component';

@Component({
  selector: 'app-predictors-dashboard', templateUrl: './predictors-dashboard.component.html',
  styleUrls: ['./predictors-dashboard.component.css'], standalone: true,
  imports: [
    IconComponent, DataEmptyStateComponent, PredictorBrowseCardComponent,
    PredictorDraftSlideoutComponent, WeatherStationBrowseCardComponent, RouterLink
  ]
})
export class PredictorsDashboardComponent {
  private readonly router = inject(Router);
  private readonly actions = inject(PredictorWorkspaceActionsService);
  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly addPredictorOpen = signal(false);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly search = signal('');
  readonly statusFilter = signal<FacilityPredictorStatusFilter>('all');
  readonly typeFilter = signal<FacilityPredictorTypeFilter>('all');
  readonly sortBy = signal<FacilityPredictorSort>('attention');
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly accountPredictorsRoute = computed(() => {
    const account = this.workspace.account();
    return account ? [...this.navigation.accountDataRoute(account.guid), 'predictors'] : undefined;
  });
  readonly filteredBrowseItems = computed(() => {
    const search = this.search().trim().toLowerCase();
    return [...this.workspace.browseItems()]
      .filter(item => !search || itemSearchText(item).includes(search))
      .filter(item => this.matchesStatus(item, this.statusFilter()))
      .filter(item => this.matchesType(item, this.typeFilter()))
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
      this.addPredictorOpen.set(false);
      this.actionError.set(undefined);
    }
  }
  async openWeatherWorkbench(): Promise<void> {
    const facility = this.workspace.facility();
    if (!facility || !this.canAct()) return;
    this.addPredictorOpen.set(false);
    await this.router.navigate(this.navigation.facilityWeatherPredictorCreateRoute(facility.guid));
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

  private matchesStatus(item: PredictorBrowseItem, filter: FacilityPredictorStatusFilter): boolean {
    const tone = item.kind === 'standard' ? item.card.statusTone : item.group.statusTone;
    const readingCount = item.kind === 'standard' ? item.card.readingCount : item.group.readingCount;
    if (filter === 'attention') return tone === 'danger' || tone === 'warning';
    if (filter === 'noReadings') return readingCount === 0;
    if (filter === 'clear') return readingCount > 0 && tone === 'success';
    return true;
  }
  private matchesType(item: PredictorBrowseItem, filter: FacilityPredictorTypeFilter): boolean {
    if (filter === 'standard') return item.kind === 'standard';
    if (filter === 'weather') return item.kind === 'weather';
    return true;
  }
  private compareCards(first: PredictorBrowseItem, second: PredictorBrowseItem): number {
    const nameOrder = itemName(first).localeCompare(itemName(second)) || itemKey(first).localeCompare(itemKey(second));
    if (this.sortBy() === 'predictorName') return nameOrder;
    if (this.sortBy() === 'latestReading') return itemLatest(second) - itemLatest(first) || nameOrder;
    return attentionRank(first) - attentionRank(second) || nameOrder;
  }
}

function attentionRank(item: PredictorBrowseItem): number {
  const tone = item.kind === 'standard' ? item.card.statusTone : item.group.statusTone;
  const readingCount = item.kind === 'standard' ? item.card.readingCount : item.group.readingCount;
  if (tone === 'danger') return 0;
  if (readingCount === 0) return 1;
  if (tone === 'warning') return 2;
  if (tone === 'info') return 3;
  return 4;
}

function itemSearchText(item: PredictorBrowseItem): string {
  return item.kind === 'standard' ? item.card.searchText : item.group.searchText;
}
function itemName(item: PredictorBrowseItem): string {
  return item.kind === 'standard' ? item.card.predictor.name || '' : item.group.stationName;
}
function itemKey(item: PredictorBrowseItem): string {
  return item.kind === 'standard' ? item.card.predictor.guid : item.group.routeKey;
}
function itemLatest(item: PredictorBrowseItem): number {
  return item.kind === 'standard' ? item.card.latestReadingSortValue : item.group.latestReadingSortValue;
}

import { Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacility } from '@data/models/idbModels/facility';
import { PredictorBrowseItem, buildPredictorCards, buildWeatherStationGroups } from '@app/v1/facility/data/predictors/models';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ResourceBrowseCardView } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import {
  buildPredictorResourceView,
  buildWeatherStationResourceView
} from '@app/v1/facility/data/predictors/predictors-dashboard/predictor-browse-card/predictor-browse-card.view';

type PredictorStatusFilter = 'all' | 'attention' | 'noReadings' | 'clear';
type PredictorTypeFilter = 'all' | 'standard' | 'weather';
type PredictorSort = 'attention' | 'predictorName' | 'facilityName' | 'latestReading';

interface PortfolioPredictorCard {
  readonly item: PredictorBrowseItem;
  readonly facility: IdbFacility;
  readonly view: ResourceBrowseCardView;
  readonly key: string;
  readonly searchText: string;
  readonly readingCount: number;
  readonly latestReadingSortValue: number;
  readonly statusTone: 'success' | 'warning' | 'danger' | 'info';
}

@Component({
  selector: 'app-account-portfolio-predictors-tab',
  templateUrl: './account-portfolio-predictors-tab.component.html',
  styleUrls: ['./account-portfolio-predictors-tab.component.css'],
  standalone: false
})
export class AccountPortfolioPredictorsTabComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly status = inject(WorkspaceStatusService);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  readonly filtersForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    type: new FormControl<PredictorTypeFilter>('all', { nonNullable: true }),
    status: new FormControl<PredictorStatusFilter>('all', { nonNullable: true }),
    sort: new FormControl<PredictorSort>('attention', { nonNullable: true })
  });
  readonly filters = toSignal(this.filtersForm.valueChanges, { initialValue: this.filtersForm.getRawValue() });
  readonly predictorCards = computed<PortfolioPredictorCard[]>(() => {
    const predictors = this.workspace.predictors();
    const predictorData = this.workspace.predictorData();

    return this.workspace.facilities().flatMap(facility => {
      const facilityPredictors = predictors.filter(predictor => predictor.facilityId === facility.guid);
      const facilityPredictorData = predictorData.filter(reading => reading.facilityId === facility.guid);
      const cards = buildPredictorCards(
        facilityPredictors,
        facilityPredictorData,
        this.status.items(),
        this.status.state() === 'ready'
      ).filter(card => card.predictor.predictorType !== 'Weather');
      const groups = buildWeatherStationGroups(
        facilityPredictors,
        facilityPredictorData,
        this.status.items(),
        this.status.state() === 'ready'
      );
      return [
        ...cards.map(card => ({
          item: { kind: 'standard' as const, card },
          facility,
          view: buildPredictorResourceView(card, facility),
          key: `${facility.guid}:standard:${card.predictor.guid}`,
          searchText: `${facility.name} ${card.searchText}`.toLocaleLowerCase(),
          readingCount: card.readingCount, latestReadingSortValue: card.latestReadingSortValue, statusTone: card.statusTone
        })),
        ...groups.map(group => ({
          item: { kind: 'weather' as const, group },
          facility,
          view: buildWeatherStationResourceView(group, facility),
          key: `${facility.guid}:weather:${group.routeKey}`,
          searchText: `${facility.name} ${group.searchText}`.toLocaleLowerCase(),
          readingCount: group.readingCount, latestReadingSortValue: group.latestReadingSortValue, statusTone: group.statusTone
        }))
      ];
    });
  });

  readonly filteredPredictorCards = computed(() => {
    const filters = this.filters();
    const search = filters.search.trim().toLocaleLowerCase();
    return this.predictorCards()
      .filter(entry => !search || entry.searchText.includes(search))
      .filter(entry => filters.type === 'all' || entry.item.kind === filters.type)
      .filter(entry => filters.status === 'all'
        || (filters.status === 'attention' && (entry.statusTone === 'danger' || entry.statusTone === 'warning'))
        || (filters.status === 'noReadings' && entry.readingCount === 0)
        || (filters.status === 'clear' && entry.readingCount > 0 && entry.statusTone === 'success'))
      .sort((first, second) => {
        const nameOrder = first.view.title.localeCompare(second.view.title) || first.facility.name.localeCompare(second.facility.name);
        if (filters.sort === 'predictorName') return nameOrder;
        if (filters.sort === 'facilityName') return first.facility.name.localeCompare(second.facility.name) || nameOrder;
        if (filters.sort === 'latestReading') return second.latestReadingSortValue - first.latestReadingSortValue || nameOrder;
        return attentionRank(first) - attentionRank(second) || nameOrder;
      });
  });

  open(entry: PortfolioPredictorCard): void {
    const route = entry.item.kind === 'standard'
      ? this.navigation.facilityPredictorRoute(entry.facility.guid, entry.item.card.predictor.guid, 'settings')
      : this.navigation.facilityWeatherPredictorRoute(entry.facility.guid, entry.item.group.routeKey);
    void this.router.navigate(route);
  }
}

function attentionRank(entry: PortfolioPredictorCard): number {
  if (entry.statusTone === 'danger') return 0;
  if (entry.readingCount === 0) return 1;
  if (entry.statusTone === 'warning') return 2;
  return entry.statusTone === 'info' ? 3 : 4;
}

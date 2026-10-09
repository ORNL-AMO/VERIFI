import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacility } from '@data/models/idbModels/facility';
import { PredictorBrowseItem, buildPredictorCards, buildWeatherStationGroups } from '@app/v1/facility/data/predictors/models';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import {
  READ_ONLY_RESOURCE_BROWSE_CARD_CAPABILITIES,
  ResourceBrowseCardView
} from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import {
  buildPredictorResourceView,
  buildWeatherStationResourceView
} from '@app/v1/facility/data/predictors/predictors-dashboard/predictor-browse-card/predictor-browse-card.view';

interface PortfolioPredictorCard {
  readonly item: PredictorBrowseItem;
  readonly facility: IdbFacility;
  readonly view: ResourceBrowseCardView;
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
  readonly cardCapabilities = READ_ONLY_RESOURCE_BROWSE_CARD_CAPABILITIES;

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
          view: buildPredictorResourceView(card, facility)
        })),
        ...groups.map(group => ({
          item: { kind: 'weather' as const, group },
          facility,
          view: buildWeatherStationResourceView(group, facility)
        }))
      ];
    });
  });

  open(entry: PortfolioPredictorCard): void {
    const route = entry.item.kind === 'standard'
      ? this.navigation.facilityPredictorRoute(entry.facility.guid, entry.item.card.predictor.guid, 'settings')
      : this.navigation.facilityWeatherPredictorRoute(entry.facility.guid, entry.item.group.routeKey);
    void this.router.navigate(route);
  }
}

import { Component, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacility } from '@data/models/idbModels/facility';
import { PredictorBrowseItem, buildPredictorCards, buildWeatherStationGroups } from '@app/v1/facility/data/predictors/models';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';

interface PortfolioPredictorCard {
  readonly item: PredictorBrowseItem;
  readonly facility: IdbFacility;
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
        ...cards.map(card => ({ item: { kind: 'standard' as const, card }, facility })),
        ...groups.map(group => ({ item: { kind: 'weather' as const, group }, facility }))
      ];
    });
  });
}

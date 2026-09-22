import { Component, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacility } from '@data/models/idbModels/facility';
import { PredictorCardView, buildPredictorCards } from '@app/v1/facility/data/predictors/models';

interface PortfolioPredictorCard {
  readonly card: PredictorCardView;
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

  readonly predictorCards = computed<PortfolioPredictorCard[]>(() => {
    const predictors = this.workspace.predictors();
    const predictorData = this.workspace.predictorData();

    return this.workspace.facilities().flatMap(facility => {
      const facilityPredictors = predictors.filter(predictor => predictor.facilityId === facility.guid);
      const facilityPredictorData = predictorData.filter(reading => reading.facilityId === facility.guid);
      return buildPredictorCards(facilityPredictors, facilityPredictorData)
        .map(card => ({ card, facility }));
    });
  });
}

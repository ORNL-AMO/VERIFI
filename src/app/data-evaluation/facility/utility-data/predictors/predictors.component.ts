import { Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { PredictorStatusCheck } from 'src/app/calculations/status-check-calculations/predictorStatusCheck';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';

interface PredictorListItem {
  predictor: IdbPredictor;
  predictorStatusCheck: PredictorStatusCheck;
}

@Component({
  selector: 'app-predictors',
  templateUrl: './predictors.component.html',
  styleUrl: './predictors.component.css',
  standalone: false
})
export class PredictorsComponent {
  private predictorDbService: PredictorDbService = inject(PredictorDbService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  private predictors: Signal<Array<IdbPredictor>> = toSignal(this.predictorDbService.facilityPredictors, { initialValue: [] });
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);

  predictorList: Signal<Array<PredictorListItem>> = computed(() => {
    const predictors = this.predictors();
    const facilityStatusCheck = this.facilityStatusCheck();
    if (!predictors || !facilityStatusCheck) return [];
    return predictors.map(predictor => {
      return {
        predictor,
        predictorStatusCheck: facilityStatusCheck.predictorsStatusChecks.find(psc => psc.predictorId === predictor.guid)
      };
    });
  });

}

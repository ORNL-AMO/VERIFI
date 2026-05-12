import { Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { PredictorStatusCheck } from 'src/app/calculations/status-check-calculations/predictorStatusCheck';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
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
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  private facility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: undefined });
  private accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck, { initialValue: undefined });
  private predictors: Signal<Array<IdbPredictor>> = toSignal(this.predictorDbService.facilityPredictors, { initialValue: [] });

  facilityStatusCheck: Signal<FacilityStatusCheck> = computed(() => {
    const accountStatusCheck = this.accountStatusCheck();
    const selectedFacility = this.facility();
    if (!accountStatusCheck || !selectedFacility) return;
    return accountStatusCheck.facilityStatusChecks.find(fc => fc.facility.guid === selectedFacility.guid);
  });


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

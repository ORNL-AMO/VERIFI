import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { PredictorDataHelperService, PredictorTableItem } from 'src/app/shared/helper-services/predictor-data-helper.service';

@Component({
  selector: 'app-predictors',
  templateUrl: './predictors.component.html',
  styleUrl: './predictors.component.css'
})
export class PredictorsComponent {

  predictors: Array<PredictorTableItem>;

  predictorsSub: Subscription;
  constructor(
    private predictorDbService: PredictorDbService,
    private predictorDataHelperService: PredictorDataHelperService,
    private facilityDbService: FacilitydbService
  ) { }

  ngOnInit() {
    this.predictorsSub = this.predictorDbService.facilityPredictors.subscribe(facilityPredictors => {
      this.setPredictors(facilityPredictors);
    });
  }

  ngOnDestroy() {
    this.predictorsSub.unsubscribe();
  }


  setPredictors(predictors: Array<IdbPredictor>) {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let predictorsNeedUpdate: Array<{ predictor: IdbPredictor, latestReadingDate: Date }> = this.predictorDataHelperService.checkWeatherPredictorsNeedUpdate(facility);
    this.predictors = predictors.map(predictor => {
      return this.predictorDataHelperService.getPredictorTableItem(predictor, predictorsNeedUpdate);
    });
  }
}

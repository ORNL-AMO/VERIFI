import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
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
  predictorDataSub: Subscription;
  constructor(
    private predictorDbService: PredictorDbService,
    private predictorDataHelperService: PredictorDataHelperService,
    private predictorDataDbService: PredictorDataDbService,
    private facilityDbService: FacilitydbService
  ) { }

  ngOnInit() {
    this.predictorDataSub = this.predictorDataDbService.facilityPredictorData.subscribe(val => {
      this.setPredictors();
    });


  }

  ngOnDestroy() {
    this.predictorDataSub.unsubscribe();
  }

  setPredictors() {
    let predictors: Array<IdbPredictor> = this.predictorDbService.facilityPredictors.getValue();
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let predictorsNeedUpdate: Array<{ predictor: IdbPredictor, latestReadingDate: Date }> = this.predictorDataHelperService.checkWeatherPredictorsNeedUpdate(facility);
    this.predictors = predictors.map(predictor => {
      return this.predictorDataHelperService.getPredictorTableItem(predictor, predictorsNeedUpdate);
    });
  }
}

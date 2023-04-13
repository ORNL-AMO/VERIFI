import { Component } from '@angular/core';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbFacility, PredictorData } from 'src/app/models/idb';

@Component({
  selector: 'app-degree-days',
  templateUrl: './degree-days.component.html',
  styleUrls: ['./degree-days.component.css']
})
export class DegreeDaysComponent {

  facility: IdbFacility;
  showSave: boolean;

  includeDegreeDays: boolean;
  coolingBaseTemperature: number;
  heatingBaseTemperature: number;
  constructor(private facilityDbService: FacilitydbService, private dbChangesService: DbChangesService,
    private predictorDbService: PredictordbService, private loadingService: LoadingService) {

  }

  ngOnInit() {
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.includeDegreeDays = this.facility.includeDegreeDays || false;
    this.coolingBaseTemperature = this.facility.coolingBaseTemperature;
    this.heatingBaseTemperature = this.facility.heatingBaseTemperature;
  }

  async saveFacility() {
    this.loadingService.setLoadingMessage('Updating Predictors...');
    this.loadingService.setLoadingStatus(true);
    this.facility.includeDegreeDays = this.includeDegreeDays;
    this.facility.coolingBaseTemperature = this.coolingBaseTemperature;
    this.facility.heatingBaseTemperature = this.heatingBaseTemperature;
    await this.dbChangesService.updateFacilities(this.facility);

    //update hdd/cdd predictors
    let facilityPredictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    let facilityPredictorsCopy: Array<PredictorData> = JSON.parse(JSON.stringify(facilityPredictors));
    let cddPredictor: PredictorData = facilityPredictorsCopy.find(predictor => {
      return predictor.predictorType == 'Weather' && predictor.weatherDataType == 'CDD';
    });
    let hasNew: boolean = false;
    if (!cddPredictor) {
      //add CDD Predictor
      let newPredictor: PredictorData = this.predictorDbService.getNewPredictor(facilityPredictorsCopy);
      newPredictor.name = 'CDD Calculated';
      newPredictor.weatherDataType = 'CDD';
      newPredictor.predictorType = 'Weather';
      facilityPredictorsCopy.push(newPredictor);
      hasNew = true;
    }

    let hddPredictor: PredictorData = facilityPredictorsCopy.find(predictor => {
      return predictor.predictorType == 'Weather' && predictor.weatherDataType == 'HDD';
    });
    if (!hddPredictor) {
      //add HDD Predictor
      let newPredictor: PredictorData = this.predictorDbService.getNewPredictor(facilityPredictorsCopy);
      newPredictor.name = 'HDD Calculated'
      newPredictor.weatherDataType = 'HDD';
      newPredictor.predictorType = 'Weather';
      facilityPredictorsCopy.push(newPredictor);
      hasNew = true;
    }

    //set HDD and CDD Predictor values
    if (hasNew) {
      await this.predictorDbService.updateFacilityPredictorEntries(facilityPredictorsCopy);
    }
    await this.predictorDbService.setDegreeDays(this.facility);

    this.loadingService.setLoadingStatus(false);
    this.showSave = false;
  }

  setShowSave() {
    this.showSave = true;
  }
}

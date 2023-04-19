import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbFacility, PredictorData } from 'src/app/models/idb';
import { Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { WeatherStation } from 'src/app/models/degreeDays';


@Component({
  selector: 'app-predictors-table',
  templateUrl: './predictors-table.component.html',
  styleUrls: ['./predictors-table.component.css']
})
export class PredictorsTableComponent {

  facilityPredictorsSub: Subscription;
  facilityPredictors: Array<PredictorData>;
  selectedFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  predictorToDelete: PredictorData;

  standardPredictors: Array<PredictorData>;
  degreeDayPredictors: Array<PredictorData>;


  constructor(private predictorDbService: PredictordbService, private router: Router,
    private facilitydbService: FacilitydbService, private loadingService: LoadingService,
    private weatherDataService: WeatherDataService, private degreeDaysService: DegreeDaysService) {

  }

  ngOnInit() {
    this.facilityPredictorsSub = this.predictorDbService.facilityPredictors.subscribe(val => {
      this.facilityPredictors = val;
      this.standardPredictors = new Array();
      this.degreeDayPredictors = new Array();
      val.forEach(predictor => {
        if (predictor.predictorType == 'Standard' || predictor.predictorType == undefined) {
          this.standardPredictors.push(predictor);
        } else if (predictor.predictorType == 'Weather') {
          this.degreeDayPredictors.push(predictor);
        }
      })
    });
    this.selectedFacilitySub = this.facilitydbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });
  }

  ngOnDestroy() {
    this.facilityPredictorsSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  selectDelete(predictor: PredictorData) {
    this.predictorToDelete = predictor;
  }


  async confirmDelete() {
    let deleteIndex: number = this.facilityPredictors.findIndex(facilityPredictor => { return facilityPredictor.id == this.predictorToDelete.id });
    this.facilityPredictors.splice(deleteIndex, 1);
    this.predictorToDelete = undefined;
    this.loadingService.setLoadingMessage('Deleting Predictor Data...');
    this.loadingService.setLoadingStatus(true);
    await this.predictorDbService.updateFacilityPredictorEntries(this.facilityPredictors);
    this.loadingService.setLoadingStatus(false);

  }

  cancelDelete() {
    this.predictorToDelete = undefined;
  }


  selectEditPredictor(predictor: PredictorData) {
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/utility/predictors/manage/edit-predictor/' + predictor.id);
  }

  addPredictor() {
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/utility/predictors/manage/add-predictor');
  }

  uploadData() {
    this.router.navigateByUrl('/upload');
  }


  async viewWeatherData(predictor: PredictorData) {
    let weatherStation: WeatherStation = await this.degreeDaysService.getStationById(predictor.weatherStationId);
    this.weatherDataService.selectedStation = weatherStation;
    if (predictor.weatherDataType == 'CDD') {
      this.weatherDataService.coolingTemp = predictor.coolingBaseTemperature;
      let predictorPair: PredictorData = this.degreeDayPredictors.find(predictorPair => { return predictorPair.weatherStationId == predictor.weatherStationId && predictorPair.weatherDataType == 'HDD' });
      if (predictorPair) {
        this.weatherDataService.heatingTemp = predictorPair.heatingBaseTemperature;
      }
    } else {
      this.weatherDataService.heatingTemp = predictor.heatingBaseTemperature;
      let predictorPair: PredictorData = this.degreeDayPredictors.find(predictorPair => { return predictorPair.weatherStationId == predictor.weatherStationId && predictorPair.weatherDataType == 'CDD' });
      if (predictorPair) {
        this.weatherDataService.coolingTemp = predictorPair.coolingBaseTemperature;
      }
    }
    let endDate: Date = new Date(weatherStation.end);
    endDate.setFullYear(endDate.getFullYear() - 1);
    this.weatherDataService.selectedYear = endDate.getFullYear();
    this.weatherDataService.selectedDate = endDate;
    this.weatherDataService.selectedMonth = endDate;
    this.weatherDataService.selectedFacility = this.selectedFacility;
    this.weatherDataService.zipCode = this.selectedFacility.zip;
    this.router.navigateByUrl('weather-data/annual-station')

  }

}

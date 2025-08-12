import { ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { WeatherPredictorManagementService } from 'src/app/weather-data/weather-predictor-management.service';
import * as _ from 'lodash';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-update-weather-predictors-modal',
  standalone: false,
  templateUrl: './update-weather-predictors-modal.component.html',
  styleUrl: './update-weather-predictors-modal.component.css'
})
export class UpdateWeatherPredictorsModalComponent {
  @Output('emitClose') emitClose = new EventEmitter<void>();


  showWeatherPredictorModal: boolean = false;

  facilityList: Array<{
    facilityId: string,
    startDate: Date,
    endDate: Date
  }>
  invalidForm: boolean;

  constructor(private weatherPredictorManagementService: WeatherPredictorManagementService,
    private cd: ChangeDetectorRef,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictorDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDataDbService: PredictorDataDbService
  ) { }

  ngOnInit() {
    this.setFacilityList();
    this.setInvalidForm();
  }


  ngAfterViewInit() {
    this.openWeatherPredictorModal();
    this.cd.detectChanges();
  }

  openWeatherPredictorModal() {
    this.showWeatherPredictorModal = true;
  }

  closeWeatherPredictorModal() {
    this.emitClose.emit();
  }

  async updateAccountWeatherPredictors() {
    this.closeWeatherPredictorModal();
    let results = await this.weatherPredictorManagementService.updateAccountWeatherPredictors(this.facilityList);
    if (results === "success") {
      console.log('success....')
    } else {
      // Handle error case
      console.error("Error updating weather predictors");
    }
  }

  setFacilityList() {
    this.facilityList = new Array();
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    facilities.forEach(facility => {
      let facilityPredictors: Array<IdbPredictor> = this.predictorDbService.getByFacilityId(facility.guid);
      let weatherPredictors: Array<IdbPredictor> = facilityPredictors.filter(predictor => {
        return predictor.predictorType == 'Weather';
      });
      if (weatherPredictors.length > 0) {
        let startDate: Date;
        let endDate: Date;
        weatherPredictors.forEach(predictor => {
          let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByPredictorId(predictor.guid);
          if (predictorData.length > 0) {
            predictorData = _.sortBy(predictorData, (data: IdbPredictorData) => { return new Date(data.date).getTime(); });
            let tmpStartDate: Date = new Date(predictorData[0].date);
            let tmpEndDate: Date = new Date(predictorData[predictorData.length - 1].date);
            if (!startDate || tmpStartDate.getTime() < startDate.getTime()) {
              startDate = new Date(tmpStartDate);
            }
            if (!endDate || tmpEndDate.getTime() > endDate.getTime()) {
              endDate = new Date(tmpEndDate);
            }
          }
        });
        if (!startDate || !endDate) {
          // Handle case where no valid dates were found
          let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(facility.guid);
          if (facilityMeterData.length > 0) {
            facilityMeterData = _.sortBy(facilityMeterData, (data: IdbUtilityMeterData) => { return new Date(data.readDate).getTime(); });
            let tmpStartDate: Date = new Date(facilityMeterData[0].readDate);
            let tmpEndDate: Date = new Date(facilityMeterData[facilityMeterData.length - 1].readDate);
            if (!startDate || tmpStartDate.getTime() < startDate.getTime()) {
              startDate = new Date(tmpStartDate);
            }
            if (!endDate || tmpEndDate.getTime() > endDate.getTime()) {
              endDate = new Date(tmpEndDate);
            }
          }
        }
        this.facilityList.push({
          facilityId: facility.guid,
          startDate: startDate,
          endDate: endDate
        });
      }
    });
  }



  async setEndDate(eventData: string, facilityIndex: number) {
    //eventData format = yyyy-mm = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.facilityList[facilityIndex].endDate = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, 1);
    this.setInvalidForm();
  }

  async setStartDate(eventData: string, facilityIndex: number) {
    //eventData format = yyyy-mm = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.facilityList[facilityIndex].startDate = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, 1);
    this.setInvalidForm();
  }

  setInvalidForm() {
    this.invalidForm = this.facilityList.find(facilityItem => {
      return !facilityItem.startDate || !facilityItem.endDate || facilityItem.startDate.getTime() > facilityItem.endDate.getTime();
    }) !== undefined;
  }

  setEndDateToCurrentDate(){
    this.facilityList.forEach(facilityItem => {
      facilityItem.endDate = new Date();
    });
  }
}

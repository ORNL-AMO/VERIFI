import { Injectable } from '@angular/core';
import { AccountdbService } from '../indexedDB/account-db.service';
import { IdbAccount } from '../models/idbModels/account';
import { getNewIdbPredictor, IdbPredictor } from '../models/idbModels/predictor';
import { DetailDegreeDay, WeatherDataSelection } from '../models/degreeDays';
import { IdbFacility } from '../models/idbModels/facility';
import { WeatherDataReading, WeatherDataService } from './weather-data.service';
import { firstValueFrom } from 'rxjs';
import { PredictorDbService } from '../indexedDB/predictor-db.service';
import { AnalysisDbService } from '../indexedDB/analysis-db.service';
import { IdbUtilityMeter } from '../models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { CalanderizedMeter, MonthlyData } from '../models/calanderization';
import * as _ from 'lodash';
import { getCalanderizedMeterData } from '../calculations/calanderization/calanderizeMeters';
import { DatePipe, formatDate } from '@angular/common';
import { getDetailedDataForMonth } from './weatherDataCalculations';
import { getNewIdbPredictorData, IdbPredictorData } from '../models/idbModels/predictorData';
import { getDegreeDayAmount } from '../shared/sharedHelperFuntions';
import { PredictorDataDbService } from '../indexedDB/predictor-data-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from '../indexedDB/utilityMeterData-db.service';
import { LoadingService } from '../core-components/loading/loading.service';
import { DbChangesService } from '../indexedDB/db-changes.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { ToastNotificationsService } from '../core-components/toast-notifications/toast-notifications.service';


@Injectable({
  providedIn: 'root'
})
export class WeatherPredictorManagementService {

  constructor(private accountDbService: AccountdbService,
    private weatherDataService: WeatherDataService,
    private predictorDbService: PredictorDbService,
    private analysisDbService: AnalysisDbService,
    private predictorDataDbService: PredictorDataDbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private loadingService: LoadingService,
    private dbChangesService: DbChangesService,
    private facilityDbService: FacilitydbService,
    private toastNotificationService: ToastNotificationsService
  ) { }

  async createPredictorsFromWeatherDataPage(selectedFacility: IdbFacility): Promise<"success" | "error"> {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let hddPredictor: IdbPredictor;
    let cddPredictor: IdbPredictor;
    let relativeHumidityPredictor: IdbPredictor;
    let dryBulbTempPredictor: IdbPredictor;
    if (this.weatherDataService.weatherDataSelection == 'HDD' || this.weatherDataService.weatherDataSelection == 'degreeDays') {
      //create HDD predictor
      hddPredictor = getNewIdbPredictor(selectedFacility.accountId, selectedFacility.guid);
      hddPredictor.name = 'HDD Generated ' + '(' + this.weatherDataService.heatingTemp + "F)";
      hddPredictor.predictorType = 'Weather';
      hddPredictor.weatherDataType = 'HDD';
      hddPredictor.weatherStationName = this.weatherDataService.selectedStation.name;
      hddPredictor.heatingBaseTemperature = this.weatherDataService.heatingTemp;
      hddPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
      await firstValueFrom(this.predictorDbService.addWithObservable(hddPredictor));
      //add predictor to analysis
      await this.analysisDbService.addAnalysisPredictor(hddPredictor);

    }

    if (this.weatherDataService.weatherDataSelection == 'CDD' || this.weatherDataService.weatherDataSelection == 'degreeDays') {
      //create CDD predictor
      cddPredictor = getNewIdbPredictor(selectedFacility.accountId, selectedFacility.guid);
      cddPredictor.name = 'CDD Generated ' + '(' + this.weatherDataService.coolingTemp + "F)";
      cddPredictor.predictorType = 'Weather';
      cddPredictor.weatherDataType = 'CDD';
      cddPredictor.weatherStationName = this.weatherDataService.selectedStation.name;
      cddPredictor.coolingBaseTemperature = this.weatherDataService.coolingTemp;
      cddPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
      await firstValueFrom(this.predictorDbService.addWithObservable(cddPredictor));
      //add predictor to analysis
      await this.analysisDbService.addAnalysisPredictor(cddPredictor);
    }

    if (this.weatherDataService.weatherDataSelection == 'relativeHumidity') {
      //create relative humidity predictor
      relativeHumidityPredictor = getNewIdbPredictor(selectedFacility.accountId, selectedFacility.guid);
      relativeHumidityPredictor.name = "Relative Humidity";
      relativeHumidityPredictor.predictorType = 'Weather';
      relativeHumidityPredictor.weatherDataType = 'relativeHumidity';
      relativeHumidityPredictor.weatherStationName = this.weatherDataService.selectedStation.name;
      relativeHumidityPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
      await firstValueFrom(this.predictorDbService.addWithObservable(relativeHumidityPredictor));
      //add predictor to analysis
      await this.analysisDbService.addAnalysisPredictor(relativeHumidityPredictor);
    }

    if (this.weatherDataService.weatherDataSelection == 'dryBulbTemp') {
      //create dry bulb temp predictor
      dryBulbTempPredictor = getNewIdbPredictor(selectedFacility.accountId, selectedFacility.guid);
      dryBulbTempPredictor.name = "Dry Bulb Temp";
      dryBulbTempPredictor.predictorType = 'Weather';
      dryBulbTempPredictor.weatherDataType = 'dryBulbTemp';
      dryBulbTempPredictor.weatherStationName = this.weatherDataService.selectedStation.name;
      dryBulbTempPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
      await firstValueFrom(this.predictorDbService.addWithObservable(dryBulbTempPredictor));
      //add predictor to analysis
      await this.analysisDbService.addAnalysisPredictor(dryBulbTempPredictor);
    }


    //create predictor data
    //predictor data created to match start/end of meter data in facility
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == selectedFacility.guid });
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, meterData, selectedFacility, false, undefined, [], [], [selectedFacility], selectedAccount.assessmentReportVersion);
    let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(cMeter => { return cMeter.monthlyData });
    monthlyData = _.orderBy(monthlyData, (dataItem: MonthlyData) => { return dataItem.date });

    let endDate: Date = new Date(monthlyData[monthlyData.length - 1].date);
    let startDate: Date = new Date(monthlyData[0].date);
    //ISSUE: 1822
    let weatherData: Array<WeatherDataReading> | "error" = await this.weatherDataService.getHourlyData(this.weatherDataService.selectedStation.ID, startDate, endDate, ['wet_bulb_temp'])
    if (weatherData != "error") {
      while (startDate <= endDate) {
        let entryDate: Date = new Date(startDate);
        // await this.degreeDaysService.setYearHourlyData(entryDate.getMonth(), entryDate.getFullYear(), this.weatherDataService.selectedStation.ID)

        let datePipe: DatePipe = new DatePipe(navigator.language);
        let stringFormat: string = 'MMM y';
        let dateStr = datePipe.transform(startDate.toLocaleDateString(), stringFormat);
        this.loadingService.setLoadingMessage('Calculating Predictors: ' + dateStr + ' ...');

        //ISSUE: 1822
        let degreeDays: Array<DetailDegreeDay> = await getDetailedDataForMonth(weatherData, entryDate.getMonth(), entryDate.getFullYear(), this.weatherDataService.heatingTemp, this.weatherDataService.coolingTemp, this.weatherDataService.selectedStation.ID, this.weatherDataService.selectedStation.name)
        // let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDetailedDataForMonth(entryDate.getMonth(), this.weatherDataService.heatingTemp, this.weatherDataService.coolingTemp)
        let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
          return degreeDay.gapInData == true
        });
        if (cddPredictor) {
          let newCddPredictorData: IdbPredictorData = getNewIdbPredictorData(cddPredictor);
          newCddPredictorData.date = new Date(entryDate);
          newCddPredictorData.amount = getDegreeDayAmount(degreeDays, 'CDD');
          newCddPredictorData.weatherDataWarning = hasErrors != undefined;
          await firstValueFrom(this.predictorDataDbService.addWithObservable(newCddPredictorData));
        }

        if (hddPredictor) {
          let newHddPredictorData: IdbPredictorData = getNewIdbPredictorData(hddPredictor);
          newHddPredictorData.date = new Date(entryDate);
          newHddPredictorData.amount = getDegreeDayAmount(degreeDays, 'HDD');
          newHddPredictorData.weatherDataWarning = hasErrors != undefined;
          await firstValueFrom(this.predictorDataDbService.addWithObservable(newHddPredictorData));
        }

        if (relativeHumidityPredictor) {
          let newRHPredictorData: IdbPredictorData = getNewIdbPredictorData(relativeHumidityPredictor);
          newRHPredictorData.date = new Date(entryDate);
          newRHPredictorData.amount = getDegreeDayAmount(degreeDays, 'relativeHumidity');
          newRHPredictorData.weatherDataWarning = hasErrors != undefined;
          await firstValueFrom(this.predictorDataDbService.addWithObservable(newRHPredictorData));
        }

        if (dryBulbTempPredictor) {
          let newDryBulbTempPredictorData: IdbPredictorData = getNewIdbPredictorData(dryBulbTempPredictor);
          newDryBulbTempPredictorData.date = new Date(entryDate);
          newDryBulbTempPredictorData.amount = getDegreeDayAmount(degreeDays, 'dryBulbTemp');
          newDryBulbTempPredictorData.weatherDataWarning = hasErrors != undefined;
          await firstValueFrom(this.predictorDataDbService.addWithObservable(newDryBulbTempPredictorData));
        }
        startDate.setMonth(startDate.getMonth() + 1);
      }

      await this.dbChangesService.selectAccount(selectedAccount, true);
      return "success";
    } else {
      return "error";
    }
  }


  async updateAccountWeatherPredictors(): Promise<"success" | "error"> {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Updating Weather Predictors...');
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let weatherPredictors: Array<IdbPredictor> = accountPredictors.filter(predictor => {
      return predictor.predictorType == 'Weather';
    });
    let accountPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    let results: "success" | "error" = "success";
    let hasWarning: boolean = false;
    for (let i = 0; i < weatherPredictors.length; i++) {
      let weatherPredictor: IdbPredictor = weatherPredictors[i];
      let facility: IdbFacility = this.facilityDbService.getFacilityById(weatherPredictor.facilityId);
      this.loadingService.setLoadingMessage('Updating Predictor Data for ' + facility.name + ', ' + weatherPredictor.name + '...');
      let predictorData: Array<IdbPredictorData> = accountPredictorData.filter(data => {
        return data.predictorId == weatherPredictor.guid;
      });
      if (predictorData.length > 0) {
        let lastPredictorData: IdbPredictorData = _.maxBy(predictorData, (data: IdbPredictorData) => new Date(data.date).getTime());
        let lastDate: Date = new Date(lastPredictorData.date);
        let today: Date = new Date();
        if (lastDate.getFullYear() < today.getFullYear() ||
          (lastDate.getFullYear() == today.getFullYear() && lastDate.getMonth() < today.getMonth() - 1)) {
          this.loadingService.setLoadingMessage('Updating predictor data for ' + weatherPredictor.name + ' from ' + formatDate(lastDate, 'MM/yyyy', 'en-US') + ' to ' + formatDate(today, 'MM/yyyy', 'en-US'));
          //add predictor data
          let weatherData: Array<WeatherDataReading> | "error" = await this.weatherDataService.getHourlyData(this.weatherDataService.selectedStation.ID, lastDate, today, [])
          if (weatherData != "error") {
            while (lastDate.getFullYear() < today.getFullYear() || (lastDate.getFullYear() == today.getFullYear() && (lastDate.getMonth()) < today.getMonth() - 1)) {
              lastDate.setMonth(lastDate.getMonth() + 1);
              let degreeDays: Array<DetailDegreeDay> = await getDetailedDataForMonth(weatherData, lastDate.getMonth(), lastDate.getFullYear(), this.weatherDataService.heatingTemp, this.weatherDataService.coolingTemp, this.weatherDataService.selectedStation.ID, this.weatherDataService.selectedStation.name)
              let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
                return degreeDay.gapInData == true
              });
              let newPredictorData: IdbPredictorData = getNewIdbPredictorData(weatherPredictor);
              newPredictorData.date = new Date(lastDate);
              if (weatherPredictor.weatherDataType == 'HDD') {
                newPredictorData.amount = getDegreeDayAmount(degreeDays, 'HDD');
              } else if (weatherPredictor.weatherDataType == 'CDD') {
                newPredictorData.amount = getDegreeDayAmount(degreeDays, 'CDD');
              } else if (weatherPredictor.weatherDataType == 'relativeHumidity') {
                newPredictorData.amount = getDegreeDayAmount(degreeDays, 'relativeHumidity');
              } else if (weatherPredictor.weatherDataType == 'dryBulbTemp') {
                newPredictorData.amount = getDegreeDayAmount(degreeDays, 'dryBulbTemp');
              }
              newPredictorData.weatherDataWarning = hasErrors != undefined;
              if (newPredictorData.weatherDataWarning) {
                hasWarning = true;
              }
              await firstValueFrom(this.predictorDataDbService.addWithObservable(newPredictorData));
            }
          } else {
            results = "error"
          }
        }
      }
    }
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.selectAccount(selectedAccount, true);
    this.loadingService.setLoadingStatus(false);
    if (hasWarning) {
      this.toastNotificationService.showToast("Weather Predictors Updated", "One or more entries were calculated with gaps in data. Be sure to double check your predictor data for errors.", undefined, false, "alert-warning")
    } else {
      this.toastNotificationService.showToast("Weather Predictors Updated", "No gaps in data found while calculating weather predictors.", undefined, false, "alert-success")
    }


    return results;
  }
}

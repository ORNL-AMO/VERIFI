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
import { checkSameMonth } from '../data-management/data-management-import/import-services/upload-helper-functions';


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


  async updateAccountWeatherPredictors(facilityList: Array<{ facilityId: string, startDate: Date, endDate: Date }>): Promise<"success" | "error"> {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Updating Weather Predictors...');
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let accountPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    let results: "success" | "error" = "success";
    let hasWarning: boolean = false;
    //iterate facility list
    for (let i = 0; i < facilityList.length; i++) {
      let facilityWeatherPredictors: Array<IdbPredictor> = accountPredictors.filter(predictor => {
        return predictor.predictorType == 'Weather' && predictor.facilityId == facilityList[i].facilityId;
      });
      let facility: IdbFacility = this.facilityDbService.getFacilityById(facilityList[i].facilityId);
      //iterate weather predictors for facility
      for (let p = 0; p < facilityWeatherPredictors.length; p++) {
        let weatherPredictor: IdbPredictor = facilityWeatherPredictors[p];
        this.loadingService.setLoadingMessage('Updating Predictor Data for ' + facility.name + ', ' + weatherPredictor.name + '...');
        //existing predictor data for this predictor
        let predictorData: Array<IdbPredictorData> = accountPredictorData.filter(data => {
          return data.predictorId == weatherPredictor.guid;
        });
        let startDate: Date = new Date(facilityList[i].startDate);
        let endDate: Date = new Date(facilityList[i].endDate);
        //fetch weather data from predictor station

        while (startDate < endDate) {
          let entryDate: Date = new Date(startDate);
          let monthPredictorEntry: IdbPredictorData = predictorData.find(data => {
            return checkSameMonth(new Date(data.date), entryDate);
          });
          if (!monthPredictorEntry) {
            monthPredictorEntry = getNewIdbPredictorData(weatherPredictor);
            //add predictor data
            this.loadingService.setLoadingMessage('Fetching weather data for ' + facility.name + ', ' + weatherPredictor.name + ' for ' + formatDate(startDate, 'MM/yyyy', 'en-US'));
            let nextMonthsDate: Date = new Date(startDate)
            nextMonthsDate.setMonth(nextMonthsDate.getMonth() + 1);
            let weatherData: Array<WeatherDataReading> | "error" = await this.weatherDataService.getHourlyData(weatherPredictor.weatherStationId, startDate, nextMonthsDate, []);
            this.loadingService.setLoadingMessage('Calculating predictor data for ' + facility.name + ', ' + weatherPredictor.name + ' for ' + formatDate(startDate, 'MM/yyyy', 'en-US'));
            if (weatherData != "error") {
              let degreeDays: Array<DetailDegreeDay> = await getDetailedDataForMonth(weatherData, entryDate.getMonth(), entryDate.getFullYear(), weatherPredictor.heatingBaseTemperature, weatherPredictor.coolingBaseTemperature, weatherPredictor.weatherStationId, weatherPredictor.weatherStationName)
              let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
                return degreeDay.gapInData == true
              });
              let newPredictorData: IdbPredictorData = getNewIdbPredictorData(weatherPredictor);
              newPredictorData.date = new Date(entryDate);
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
            else {
              results = "error"
            }
          }
          startDate.setMonth(startDate.getMonth() + 1);
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

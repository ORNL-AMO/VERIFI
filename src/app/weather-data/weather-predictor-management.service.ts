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
import { CalanderizedMeter, MonthlyData } from '../models/calanderization';
import * as _ from 'lodash';
import { getDetailedDataForMonth } from './weatherDataCalculations';
import { getNewIdbPredictorData, IdbPredictorData } from '../models/idbModels/predictorData';
import { getDegreeDayAmount } from '../shared/sharedHelperFunctions';
import { PredictorDataDbService } from '../indexedDB/predictor-data-db.service';
import { LoadingService } from '../core-components/loading/loading.service';
import { DbChangesService } from '../indexedDB/db-changes.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { checkSameMonthPredictorData } from '../data-management/data-management-import/import-services/upload-helper-functions';
import { Month, Months } from '../shared/form-data/months';
import { CalanderizationService } from '../shared/helper-services/calanderization.service';


@Injectable({
  providedIn: 'root'
})
export class WeatherPredictorManagementService {

  hasWarning: boolean = false;
  heatingTemp: number;
  coolingTemp: number;

  constructor(private accountDbService: AccountdbService,
    private weatherDataService: WeatherDataService,
    private predictorDbService: PredictorDbService,
    private analysisDbService: AnalysisDbService,
    private predictorDataDbService: PredictorDataDbService,
    private loadingService: LoadingService,
    private dbChangesService: DbChangesService,
    private facilityDbService: FacilitydbService,
    private calanderizationService: CalanderizationService
  ) {
  }

  async setLoadingMessages(selectedFacility: IdbFacility) {
    this.loadingService.addLoadingMessage('Adding Predictors');

    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMetersByFacilityID(selectedFacility.guid);
    let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(cMeter => { return cMeter.monthlyData });
    monthlyData = _.orderBy(monthlyData, (dataItem: MonthlyData) => { return dataItem.date });

    let endDate: Date = new Date(monthlyData[monthlyData.length - 1].date);
    let startDate: Date = new Date(monthlyData[0].date);

    let weatherData: Array<WeatherDataReading> | "error" = await this.weatherDataService.getHourlyData(this.weatherDataService.selectedStation.ID, startDate, endDate, ['wet_bulb_temp'])
    if (weatherData != "error") {
      while (startDate <= endDate) {
        let entryDate: Date = new Date(startDate);

        let month: Month = Months.find(m => m.monthNumValue == entryDate.getMonth());
        let dateStr = month.abbreviation + ', ' + entryDate.getFullYear();
        this.loadingService.addLoadingMessage('Calculating Predictors: ' + dateStr);

        startDate.setMonth(startDate.getMonth() + 1);
      }
    }
  }

  async createPredictorsFromWeatherDataPage(selectedFacility: IdbFacility, selectedValues: Array<{ name: WeatherDataSelection, value?: number }>): Promise<"success" | "error"> {
    let idx: number = 0;
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let hddPredictor: IdbPredictor;
    let cddPredictor: IdbPredictor;
    let relativeHumidityPredictor: IdbPredictor;
    let dryBulbTempPredictor: IdbPredictor;
    if (selectedValues.find(val => val.name == 'HDD')) {
      //create HDD predictor
      hddPredictor = getNewIdbPredictor(selectedFacility.accountId, selectedFacility.guid);
      let hddValue: number = selectedValues.find(val => val.name == 'HDD').value;
      this.heatingTemp = hddValue;

      hddPredictor.name = 'HDD Generated ' + '(' + this.heatingTemp + "F)";
      hddPredictor.heatingBaseTemperature = this.heatingTemp;
      hddPredictor.predictorType = 'Weather';
      hddPredictor.weatherDataType = 'HDD';
      hddPredictor.weatherStationName = this.weatherDataService.selectedStation.name;
      hddPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
      await firstValueFrom(this.predictorDbService.addWithObservable(hddPredictor));
      //add predictor to analysis
      await this.analysisDbService.addAnalysisPredictor(hddPredictor);

    }

    if (selectedValues.find(val => val.name == 'CDD')) {
      //create CDD predictor
      cddPredictor = getNewIdbPredictor(selectedFacility.accountId, selectedFacility.guid);
      let cddValue: number = selectedValues.find(val => val.name == 'CDD').value;
      this.coolingTemp = cddValue;

      cddPredictor.name = 'CDD Generated ' + '(' + this.coolingTemp + "F)";
      cddPredictor.coolingBaseTemperature = this.coolingTemp;
      cddPredictor.predictorType = 'Weather';
      cddPredictor.weatherDataType = 'CDD';
      cddPredictor.weatherStationName = this.weatherDataService.selectedStation.name;
      cddPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
      await firstValueFrom(this.predictorDbService.addWithObservable(cddPredictor));
      //add predictor to analysis
      await this.analysisDbService.addAnalysisPredictor(cddPredictor);
    }

    if (selectedValues.find(val => val.name == 'relativeHumidity')) {
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

    if (selectedValues.find(val => val.name == 'dryBulbTemp')) {
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
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMetersByFacilityID(selectedFacility.guid);
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

        let month: Month = Months.find(m => m.monthNumValue == entryDate.getMonth());
        let dateStr = month.abbreviation + ', ' + entryDate.getFullYear();
        this.loadingService.setCurrentLoadingIndex(++idx);

        //ISSUE: 1822
        let degreeDays: Array<DetailDegreeDay> = await getDetailedDataForMonth(weatherData, entryDate.getMonth(), entryDate.getFullYear(), this.heatingTemp, this.coolingTemp, this.weatherDataService.selectedStation.ID, this.weatherDataService.selectedStation.name)
        // let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDetailedDataForMonth(entryDate.getMonth(), this.weatherDataService.heatingTemp, this.weatherDataService.coolingTemp)
        let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
          return degreeDay.gapInData == true
        });
        if (cddPredictor) {
          let newCddPredictorData: IdbPredictorData = getNewIdbPredictorData(cddPredictor);
          newCddPredictorData.month = entryDate.getMonth() + 1;
          newCddPredictorData.year = entryDate.getFullYear();
          newCddPredictorData.amount = getDegreeDayAmount(degreeDays, 'CDD');
          newCddPredictorData.weatherDataWarning = hasErrors != undefined;
          await firstValueFrom(this.predictorDataDbService.addWithObservable(newCddPredictorData));
        }

        if (hddPredictor) {
          let newHddPredictorData: IdbPredictorData = getNewIdbPredictorData(hddPredictor);
          newHddPredictorData.month = entryDate.getMonth() + 1;
          newHddPredictorData.year = entryDate.getFullYear();
          newHddPredictorData.amount = getDegreeDayAmount(degreeDays, 'HDD');
          newHddPredictorData.weatherDataWarning = hasErrors != undefined;
          await firstValueFrom(this.predictorDataDbService.addWithObservable(newHddPredictorData));
        }

        if (relativeHumidityPredictor) {
          let newRHPredictorData: IdbPredictorData = getNewIdbPredictorData(relativeHumidityPredictor);
          newRHPredictorData.month = entryDate.getMonth() + 1;
          newRHPredictorData.year = entryDate.getFullYear();
          newRHPredictorData.amount = getDegreeDayAmount(degreeDays, 'relativeHumidity');
          newRHPredictorData.weatherDataWarning = hasErrors != undefined;
          await firstValueFrom(this.predictorDataDbService.addWithObservable(newRHPredictorData));
        }

        if (dryBulbTempPredictor) {
          let newDryBulbTempPredictorData: IdbPredictorData = getNewIdbPredictorData(dryBulbTempPredictor);
          newDryBulbTempPredictorData.month = entryDate.getMonth() + 1;
          newDryBulbTempPredictorData.year = entryDate.getFullYear();
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

  addLoadingMessages(facilityList: Array<{ facilityId: string, startDate: Date, endDate: Date }>) {
    this.loadingService.clearLoadingMessages();
    for (let i = 0; i < facilityList.length; i++) {
      let facilityWeatherPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue().filter(predictor => {
        return predictor.predictorType == 'Weather' && predictor.facilityId == facilityList[i].facilityId;
      });
      let facility: IdbFacility = this.facilityDbService.getFacilityById(facilityList[i].facilityId);
      for (let p = 0; p < facilityWeatherPredictors.length; p++) {
        let weatherPredictor: IdbPredictor = facilityWeatherPredictors[p];
        this.loadingService.addLoadingMessage('Updating Predictor Data for ' + facility.name + ', ' + weatherPredictor.name);
        let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue().filter(data => {
          return data.predictorId == weatherPredictor.guid;
        });
        let startDate: Date = new Date(facilityList[i].startDate);
        let endDate: Date = new Date(facilityList[i].endDate);
        while (startDate < endDate) {
          let entryDate: Date = new Date(startDate);
          let monthPredictorEntry: IdbPredictorData = predictorData.find(data => {
            return checkSameMonthPredictorData(data, entryDate);
          });
          if (!monthPredictorEntry) {
            let month: Month = Months.find(m => m.monthNumValue == entryDate.getMonth());
            let formatedDate: string = month.abbreviation + ', ' + entryDate.getFullYear();
          
            this.loadingService.addLoadingMessage('Fetching weather data for ' + facility.name + ', ' + weatherPredictor.name + ' for ' + formatedDate);
            this.loadingService.addLoadingMessage('Calculating predictor data for ' + facility.name + ', ' + weatherPredictor.name + ' for ' + formatedDate);
          }
          startDate.setMonth(startDate.getMonth() + 1);
        }
      }
    }
  }

  async updateAccountWeatherPredictors(facilityList: Array<{ facilityId: string, startDate: Date, endDate: Date }>): Promise<"success" | "error"> {
    this.loadingService.setContext('updating-weather-predictors');
    this.loadingService.setTitle('Updating Weather Predictors');
    this.addLoadingMessages(facilityList);
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let accountPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    let results: "success" | "error" = "success";
    this.hasWarning = false;
    let index: number = -1;
    //iterate facility list
    for (let i = 0; i < facilityList.length; i++) {
      let facilityWeatherPredictors: Array<IdbPredictor> = accountPredictors.filter(predictor => {
        return predictor.predictorType == 'Weather' && predictor.facilityId == facilityList[i].facilityId;
      });
   
      //iterate weather predictors for facility
      for (let p = 0; p < facilityWeatherPredictors.length; p++) {
        let weatherPredictor: IdbPredictor = facilityWeatherPredictors[p];
        ++index;
        this.loadingService.setCurrentLoadingIndex(index);
        
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
            return checkSameMonthPredictorData(data, entryDate);
          });
          if (!monthPredictorEntry) {
            monthPredictorEntry = getNewIdbPredictorData(weatherPredictor);
            //add predictor data
            index++;
            this.loadingService.setCurrentLoadingIndex(index);
            
            let nextMonthsDate: Date = new Date(startDate)
            nextMonthsDate.setMonth(nextMonthsDate.getMonth() + 1);
            let weatherData: Array<WeatherDataReading> | "error" = await this.weatherDataService.getHourlyData(weatherPredictor.weatherStationId, startDate, nextMonthsDate, []);
            index++;
            this.loadingService.setCurrentLoadingIndex(index);
            
            if (weatherData != "error") {
              let degreeDays: Array<DetailDegreeDay> = await getDetailedDataForMonth(weatherData, entryDate.getMonth(), entryDate.getFullYear(), weatherPredictor.heatingBaseTemperature, weatherPredictor.coolingBaseTemperature, weatherPredictor.weatherStationId, weatherPredictor.weatherStationName)
              let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
                return degreeDay.gapInData == true
              });
              let newPredictorData: IdbPredictorData = getNewIdbPredictorData(weatherPredictor);
              newPredictorData.month = entryDate.getMonth() + 1;
              newPredictorData.year = entryDate.getFullYear();
              if (weatherPredictor.weatherDataType == 'HDD') {
                newPredictorData.amount = getDegreeDayAmount(degreeDays, 'HDD');
              } else if (weatherPredictor.weatherDataType == 'CDD') {
                newPredictorData.amount = getDegreeDayAmount(degreeDays, 'CDD');
              } else if (weatherPredictor.weatherDataType == 'relativeHumidity') {
                newPredictorData.amount = getDegreeDayAmount(degreeDays, 'relativeHumidity');
              } else if (weatherPredictor.weatherDataType == 'dryBulbTemp') {
                newPredictorData.amount = getDegreeDayAmount(degreeDays, 'dryBulbTemp');
              }
              newPredictorData.weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
              if (newPredictorData.weatherDataWarning) {
                this.hasWarning = true;
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
    this.loadingService.isLoadingComplete.next(true);
    return results;
  }
}

import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Injectable, inject } from '@angular/core';
import { getNewIdbPredictor, IdbPredictor } from '../models/idbModels/predictor';
import { DetailDegreeDay, WeatherDataSelection } from '../models/degreeDays';
import { IdbFacility } from '../models/idbModels/facility';
import { WeatherDataReading, WeatherDataService } from './weather-data.service';
import { AnalysisDbService } from '../indexedDB/analysis-db.service';
import { CalanderizedMeter, MonthlyData } from '../models/calanderization';
import * as _ from 'lodash';
import { getDetailedDataForMonth } from './weatherDataCalculations';
import { getNewIdbPredictorData, IdbPredictorData } from '../models/idbModels/predictorData';
import { getDegreeDayAmount } from '../shared/sharedHelperFunctions';
import { PredictorCommandHandler } from '../account-workspace/handlers/predictor-command-handler.service';
import { LoadingService } from '../core-components/loading/loading.service';
import { checkSameMonthPredictorData } from '../data-management/data-management-import/import-services/upload-helper-functions';
import { Month, Months } from '../shared/form-data/months';
import { CalanderizationService } from '../shared/helper-services/calanderization.service';


@Injectable({
  providedIn: 'root'
})
export class WeatherPredictorManagementService {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  hasWarning: boolean = false;
  heatingTemp: number;
  coolingTemp: number;

  constructor(
    private weatherDataService: WeatherDataService,
    private predictorHandler: PredictorCommandHandler,
    private analysisDbService: AnalysisDbService,
    private loadingService: LoadingService,
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
    let hddPredictor: IdbPredictor;
    let cddPredictor: IdbPredictor;
    let relativeHumidityPredictor: IdbPredictor;
    let dryBulbTempPredictor: IdbPredictor;
    let wetBulbTempPredictor: IdbPredictor;
    let dewPointTempPredictor: IdbPredictor;
    let precipitationPredictor: IdbPredictor;
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
      await this.predictorHandler.addPredictor(hddPredictor, this.accountWorkspaceStore.account()?.guid ?? selectedFacility.accountId);
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
      await this.predictorHandler.addPredictor(cddPredictor, this.accountWorkspaceStore.account()?.guid ?? selectedFacility.accountId);
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
      await this.predictorHandler.addPredictor(relativeHumidityPredictor, this.accountWorkspaceStore.account()?.guid ?? selectedFacility.accountId);
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
      await this.predictorHandler.addPredictor(dryBulbTempPredictor, this.accountWorkspaceStore.account()?.guid ?? selectedFacility.accountId);
      //add predictor to analysis
      await this.analysisDbService.addAnalysisPredictor(dryBulbTempPredictor);
    }

    if (selectedValues.find(val => val.name == 'wetBulbTemp')) {
      //create wet bulb temp predictor
      wetBulbTempPredictor = getNewIdbPredictor(selectedFacility.accountId, selectedFacility.guid);
      wetBulbTempPredictor.name = "Wet Bulb Temp";
      wetBulbTempPredictor.predictorType = 'Weather';
      wetBulbTempPredictor.weatherDataType = 'wetBulbTemp';
      wetBulbTempPredictor.weatherStationName = this.weatherDataService.selectedStation.name;
      wetBulbTempPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
      await this.predictorHandler.addPredictor(wetBulbTempPredictor, this.accountWorkspaceStore.account()?.guid ?? selectedFacility.accountId);
      //add predictor to analysis
      await this.analysisDbService.addAnalysisPredictor(wetBulbTempPredictor);
    }

    if (selectedValues.find(val => val.name == 'dewPointTemp')) {
      //create dew point temp predictor
      dewPointTempPredictor = getNewIdbPredictor(selectedFacility.accountId, selectedFacility.guid);
      dewPointTempPredictor.name = "Dew Point Temp";
      dewPointTempPredictor.predictorType = 'Weather';
      dewPointTempPredictor.weatherDataType = 'dewPointTemp';
      dewPointTempPredictor.weatherStationName = this.weatherDataService.selectedStation.name;
      dewPointTempPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
      await this.predictorHandler.addPredictor(dewPointTempPredictor, this.accountWorkspaceStore.account()?.guid ?? selectedFacility.accountId);
      //add predictor to analysis
      await this.analysisDbService.addAnalysisPredictor(dewPointTempPredictor);
    }

    if (selectedValues.find(val => val.name == 'precipitation')) {
        //create precipitation predictor
        precipitationPredictor = getNewIdbPredictor(selectedFacility.accountId, selectedFacility.guid);
        precipitationPredictor.name = "Precipitation";
        precipitationPredictor.predictorType = 'Weather';
        precipitationPredictor.weatherDataType = 'precipitation';
        precipitationPredictor.weatherStationName = this.weatherDataService.selectedStation.name;
        precipitationPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
        await this.predictorHandler.addPredictor(precipitationPredictor, this.accountWorkspaceStore.account()?.guid ?? selectedFacility.accountId);
        //add predictor to analysis
        await this.analysisDbService.addAnalysisPredictor(precipitationPredictor);
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
          await this.predictorHandler.addPredictorData(newCddPredictorData, this.accountWorkspaceStore.account()?.guid ?? selectedFacility.accountId);
        }

        if (hddPredictor) {
          let newHddPredictorData: IdbPredictorData = getNewIdbPredictorData(hddPredictor);
          newHddPredictorData.month = entryDate.getMonth() + 1;
          newHddPredictorData.year = entryDate.getFullYear();
          newHddPredictorData.amount = getDegreeDayAmount(degreeDays, 'HDD');
          newHddPredictorData.weatherDataWarning = hasErrors != undefined;
          await this.predictorHandler.addPredictorData(newHddPredictorData, this.accountWorkspaceStore.account()?.guid ?? selectedFacility.accountId);
        }

        if (relativeHumidityPredictor) {
          let newRHPredictorData: IdbPredictorData = getNewIdbPredictorData(relativeHumidityPredictor);
          newRHPredictorData.month = entryDate.getMonth() + 1;
          newRHPredictorData.year = entryDate.getFullYear();
          newRHPredictorData.amount = getDegreeDayAmount(degreeDays, 'relativeHumidity');
          newRHPredictorData.weatherDataWarning = hasErrors != undefined;
          await this.predictorHandler.addPredictorData(newRHPredictorData, this.accountWorkspaceStore.account()?.guid ?? selectedFacility.accountId);
        }

        if (dryBulbTempPredictor) {
          let newDryBulbTempPredictorData: IdbPredictorData = getNewIdbPredictorData(dryBulbTempPredictor);
          newDryBulbTempPredictorData.month = entryDate.getMonth() + 1;
          newDryBulbTempPredictorData.year = entryDate.getFullYear();
          newDryBulbTempPredictorData.amount = getDegreeDayAmount(degreeDays, 'dryBulbTemp');
          newDryBulbTempPredictorData.weatherDataWarning = hasErrors != undefined;
          await this.predictorHandler.addPredictorData(newDryBulbTempPredictorData, this.accountWorkspaceStore.account()?.guid ?? selectedFacility.accountId);
        }

        if (wetBulbTempPredictor) {
          let newWetBulbTempPredictorData: IdbPredictorData = getNewIdbPredictorData(wetBulbTempPredictor);
          newWetBulbTempPredictorData.month = entryDate.getMonth() + 1;
          newWetBulbTempPredictorData.year = entryDate.getFullYear();
          newWetBulbTempPredictorData.amount = getDegreeDayAmount(degreeDays, 'wetBulbTemp');
          newWetBulbTempPredictorData.weatherDataWarning = hasErrors != undefined;
          await this.predictorHandler.addPredictorData(newWetBulbTempPredictorData, this.accountWorkspaceStore.account()?.guid ?? selectedFacility.accountId);
        }

        if (dewPointTempPredictor) {
          let newDewPointTempPredictorData: IdbPredictorData = getNewIdbPredictorData(dewPointTempPredictor);
          newDewPointTempPredictorData.month = entryDate.getMonth() + 1;
          newDewPointTempPredictorData.year = entryDate.getFullYear();
          newDewPointTempPredictorData.amount = getDegreeDayAmount(degreeDays, 'dewPointTemp');
          newDewPointTempPredictorData.weatherDataWarning = hasErrors != undefined;
          await this.predictorHandler.addPredictorData(newDewPointTempPredictorData, this.accountWorkspaceStore.account()?.guid ?? selectedFacility.accountId);
        }

        if (precipitationPredictor) {
          let newPrecipitationPredictorData: IdbPredictorData = getNewIdbPredictorData(precipitationPredictor);
          newPrecipitationPredictorData.month = entryDate.getMonth() + 1;
          newPrecipitationPredictorData.year = entryDate.getFullYear();
          newPrecipitationPredictorData.amount = getDegreeDayAmount(degreeDays, 'precipitation');
          newPrecipitationPredictorData.weatherDataWarning = hasErrors != undefined;
          await this.predictorHandler.addPredictorData(newPrecipitationPredictorData, this.accountWorkspaceStore.account()?.guid ?? selectedFacility.accountId);
        }

        startDate.setMonth(startDate.getMonth() + 1);
      }

      return "success";
    } else {
      return "error";
    }
  }

  addLoadingMessages(facilityList: Array<{ facilityId: string, startDate: Date, endDate: Date }>) {
    this.loadingService.clearLoadingMessages();
    for (let i = 0; i < facilityList.length; i++) {
      let facilityWeatherPredictors: Array<IdbPredictor> = [...this.accountWorkspaceStore.predictors()].filter(predictor => {
        return predictor.predictorType == 'Weather' && predictor.facilityId == facilityList[i].facilityId;
      });
      let facility: IdbFacility = this.accountWorkspaceStore.facilities().find(facility => facility.guid === (facilityList[i].facilityId));
      for (let p = 0; p < facilityWeatherPredictors.length; p++) {
        let weatherPredictor: IdbPredictor = facilityWeatherPredictors[p];
        this.loadingService.addLoadingMessage('Updating Predictor Data for ' + facility.name + ', ' + weatherPredictor.name);
        let predictorData: Array<IdbPredictorData> = [...this.accountWorkspaceStore.predictorData()].filter(data => {
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
    let accountPredictors: Array<IdbPredictor> = [...this.accountWorkspaceStore.predictors()];
    let accountPredictorData: Array<IdbPredictorData> = [...this.accountWorkspaceStore.predictorData()];
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
              } else if (weatherPredictor.weatherDataType == 'wetBulbTemp') {
                newPredictorData.amount = getDegreeDayAmount(degreeDays, 'wetBulbTemp');
              } else if (weatherPredictor.weatherDataType == 'dewPointTemp') {
                newPredictorData.amount = getDegreeDayAmount(degreeDays, 'dewPointTemp');
              } else if (weatherPredictor.weatherDataType == 'precipitation') {
                newPredictorData.amount = getDegreeDayAmount(degreeDays, 'precipitation');
              }
              newPredictorData.weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
              if (newPredictorData.weatherDataWarning) {
                this.hasWarning = true;
              }
              await this.predictorHandler.addPredictorData(newPredictorData, this.accountWorkspaceStore.account()?.guid ?? weatherPredictor.accountId);
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

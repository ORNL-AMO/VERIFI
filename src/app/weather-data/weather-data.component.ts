import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { WeatherDataService } from './weather-data.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { LoadingService } from '../core-components/loading/loading.service';
import { NavigationEnd, Router } from '@angular/router';
import { ToastNotificationsService } from '../core-components/toast-notifications/toast-notifications.service';
import { WeatherDataSelection } from '../models/degreeDays';
import { UtilityMeterDatadbService } from '../indexedDB/utilityMeterData-db.service';
import * as _ from 'lodash';
import { AnalyticsService } from '../analytics/analytics.service';
import { IdbFacility } from '../models/idbModels/facility';
import { IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { IdbPredictorData } from '../models/idbModels/predictorData';
import { PredictorDataDbService } from '../indexedDB/predictor-data-db.service';
import { WeatherPredictorManagementService } from './weather-predictor-management.service';
// import { DegreeDaysService } from '../shared/helper-services/degree-days.service';

@Component({
  selector: 'app-weather-data',
  templateUrl: './weather-data.component.html',
  styleUrls: ['./weather-data.component.css'],
  standalone: false
})
export class WeatherDataComponent {

  applyToFacility: boolean;
  applyToFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  facilities: Array<IdbFacility>;
  weatherDataSelection: WeatherDataSelection;
  facilityPredictorData: Array<IdbPredictorData>;
  facilityMeterData: Array<IdbUtilityMeterData>;
  inDashboard: boolean = false;
  cddSelected: boolean = false;
  hddSelected: boolean = false;
  relativeHumiditySelected: boolean = false;
  dryBulbTempSelected: boolean = false;
  cddBaseTemp: number;
  hddBaseTemp: number;
  selectedValues: Array<{ name: WeatherDataSelection, value?: number }> = [];
  loadingSub: Subscription;

  constructor(
    private weatherDataService: WeatherDataService,
    private facilityDbService: FacilitydbService,
    private predictorDataDbService: PredictorDataDbService,
    private loadingService: LoadingService,
    private router: Router,
    private toastNotificationService: ToastNotificationsService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private analyticsService: AnalyticsService,
    // private degreeDaysService: DegreeDaysService
    private weatherPredictorManagementService: WeatherPredictorManagementService
  ) {

  }

  ngOnInit() {
    this.applyToFacilitySub = this.weatherDataService.applyToFacility.subscribe(val => {
      this.applyToFacility = val;
      if (this.applyToFacility) {
        this.weatherDataSelection = this.weatherDataService.weatherDataSelection;
        this.facilities = this.facilityDbService.accountFacilities.getValue();
        this.setWeatherDataSelection();
        if (this.weatherDataService.selectedFacility) {
          let facilityExists: IdbFacility = this.facilities.find(facility => { return facility.guid == this.weatherDataService.selectedFacility.guid });
          if (facilityExists) {
            this.selectedFacility = this.weatherDataService.selectedFacility;
            this.setFacilityData();
          }
        }
      }
    });

    this.loadingSub = this.loadingService.navigationAfterLoading.subscribe((context) => {
      if (context === 'create-weather-predictors') {
        this.navigateToUrl();
        this.loadingService.navigationAfterLoading.next(undefined);
      }
    });

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setInDashboard(event.urlAfterRedirects);
      }
    });
    this.setInDashboard(this.router.url);
  }

  ngOnDestroy() {
    this.applyToFacilitySub.unsubscribe();
    this.loadingSub.unsubscribe();
  }

  cancelApplyToFacility() {
    this.weatherDataService.applyToFacility.next(false);
  }

  setWeatherDataSelection() {
    this.cddSelected = false;
    this.hddSelected = false;
    this.relativeHumiditySelected = false;
    this.dryBulbTempSelected = false;
    this.cddBaseTemp = undefined;
    this.hddBaseTemp = undefined;

    switch (this.weatherDataSelection) {
      case 'degreeDays':
        this.cddSelected = true;
        this.hddSelected = true;
        this.cddBaseTemp = this.weatherDataService.coolingTemp;
        this.hddBaseTemp = this.weatherDataService.heatingTemp;
        break;
      case 'CDD':
        this.cddSelected = true;
        this.cddBaseTemp = this.weatherDataService.coolingTemp;
        break;
      case 'HDD':
        this.hddSelected = true;
        this.hddBaseTemp = this.weatherDataService.heatingTemp;
        break;
      case 'relativeHumidity':
        this.relativeHumiditySelected = true;
        break;
      case 'dryBulbTemp':
        this.dryBulbTempSelected = true;
        break;
    }
  }

  isButtonDisabled(): boolean {
    if (!this.selectedFacility || this.facilityMeterData?.length == 0) {
      return true;
    }
    if (!this.cddSelected && !this.hddSelected && !this.relativeHumiditySelected && !this.dryBulbTempSelected) {
      return true;
    }
    if (this.cddSelected && (this.cddBaseTemp == undefined || this.cddBaseTemp == null)) {
      return true;
    }
    if (this.hddSelected && (this.hddBaseTemp == undefined || this.hddBaseTemp == null)) {
      return true;
    }

    return false;
  }

  setSelectedValues() {
    this.selectedValues = [];
    if (this.cddSelected) {
      this.selectedValues.push({ name: 'CDD', value: this.cddBaseTemp });
    }
    if (this.hddSelected) {
      this.selectedValues.push({ name: 'HDD', value: this.hddBaseTemp });
    }
    if (this.relativeHumiditySelected) {
      this.selectedValues.push({ name: 'relativeHumidity' });
    }
    if (this.dryBulbTempSelected) {
      this.selectedValues.push({ name: 'dryBulbTemp' });
    }
  }

  async confirmCreate() {
    this.setSelectedValues();
    //Create weather data predictors and data for selected facility.

    this.analyticsService.sendEvent('weather_data_predictors');
    this.weatherDataService.applyToFacility.next(false);
    this.loadingService.setContext('create-weather-predictors');
    this.loadingService.setTitle('Create Weather Predictors');
    this.weatherPredictorManagementService.setLoadingMessages(this.selectedFacility);
    this.loadingService.setCurrentLoadingIndex(0);
    let results: "success" | "error" = await this.weatherPredictorManagementService.createPredictorsFromWeatherDataPage(this.selectedFacility, this.selectedValues);

    // let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    // let hddPredictor: IdbPredictor;
    // let cddPredictor: IdbPredictor;
    // let relativeHumidityPredictor: IdbPredictor;
    // let dryBulbTempPredictor: IdbPredictor;
    // if (this.weatherDataSelection == 'HDD' || this.weatherDataSelection == 'degreeDays') {
    //   //create HDD predictor
    //   hddPredictor = getNewIdbPredictor(this.selectedFacility.accountId, this.selectedFacility.guid);
    //   hddPredictor.name = 'HDD Generated ' + '(' + this.weatherDataService.heatingTemp + "F)";
    //   hddPredictor.predictorType = 'Weather';
    //   hddPredictor.weatherDataType = 'HDD';
    //   hddPredictor.weatherStationName = this.weatherDataService.selectedStation.name;
    //   hddPredictor.heatingBaseTemperature = this.weatherDataService.heatingTemp;
    //   hddPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
    //   await firstValueFrom(this.predictorDbService.addWithObservable(hddPredictor));
    //   //add predictor to analysis
    //   await this.analysisDbService.addAnalysisPredictor(hddPredictor);

    // }

    // if (this.weatherDataSelection == 'CDD' || this.weatherDataSelection == 'degreeDays') {
    //   //create CDD predictor
    //   cddPredictor = getNewIdbPredictor(this.selectedFacility.accountId, this.selectedFacility.guid);
    //   cddPredictor.name = 'CDD Generated ' + '(' + this.weatherDataService.coolingTemp + "F)";
    //   cddPredictor.predictorType = 'Weather';
    //   cddPredictor.weatherDataType = 'CDD';
    //   cddPredictor.weatherStationName = this.weatherDataService.selectedStation.name;
    //   cddPredictor.coolingBaseTemperature = this.weatherDataService.coolingTemp;
    //   cddPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
    //   await firstValueFrom(this.predictorDbService.addWithObservable(cddPredictor));
    //   //add predictor to analysis
    //   await this.analysisDbService.addAnalysisPredictor(cddPredictor);
    // }

    // if (this.weatherDataSelection == 'relativeHumidity') {
    //   //create relative humidity predictor
    //   relativeHumidityPredictor = getNewIdbPredictor(this.selectedFacility.accountId, this.selectedFacility.guid);
    //   relativeHumidityPredictor.name = "Relative Humidity";
    //   relativeHumidityPredictor.predictorType = 'Weather';
    //   relativeHumidityPredictor.weatherDataType = 'relativeHumidity';
    //   relativeHumidityPredictor.weatherStationName = this.weatherDataService.selectedStation.name;
    //   relativeHumidityPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
    //   await firstValueFrom(this.predictorDbService.addWithObservable(relativeHumidityPredictor));
    //   //add predictor to analysis
    //   await this.analysisDbService.addAnalysisPredictor(relativeHumidityPredictor);
    // }

    // if (this.weatherDataSelection == 'dryBulbTemp') {
    //   //create dry bulb temp predictor
    //   dryBulbTempPredictor = getNewIdbPredictor(this.selectedFacility.accountId, this.selectedFacility.guid);
    //   dryBulbTempPredictor.name = "Dry Bulb Temp";
    //   dryBulbTempPredictor.predictorType = 'Weather';
    //   dryBulbTempPredictor.weatherDataType = 'dryBulbTemp';
    //   dryBulbTempPredictor.weatherStationName = this.weatherDataService.selectedStation.name;
    //   dryBulbTempPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
    //   await firstValueFrom(this.predictorDbService.addWithObservable(dryBulbTempPredictor));
    //   //add predictor to analysis
    //   await this.analysisDbService.addAnalysisPredictor(dryBulbTempPredictor);
    // }


    // //create predictor data
    // //predictor data created to match start/end of meter data in facility
    // let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    // let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.selectedFacility.guid });
    // let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    // let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, meterData, this.selectedFacility, false, undefined, [], [], [this.selectedFacility], selectedAccount.assessmentReportVersion);
    // let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(cMeter => { return cMeter.monthlyData });
    // monthlyData = _.orderBy(monthlyData, (dataItem: MonthlyData) => { return dataItem.date });

    // let endDate: Date = new Date(monthlyData[monthlyData.length - 1].date);
    // let startDate: Date = new Date(monthlyData[0].date);
    // //ISSUE: 1822
    // let weatherData: Array<WeatherDataReading> | "error" = await this.weatherDataService.getHourlyData(this.weatherDataService.selectedStation.ID, startDate, endDate, ['wet_bulb_temp'])
    // if (weatherData != "error") {
    //   while (startDate <= endDate) {
    //     let entryDate: Date = new Date(startDate);
    //     // await this.degreeDaysService.setYearHourlyData(entryDate.getMonth(), entryDate.getFullYear(), this.weatherDataService.selectedStation.ID)

    //     let datePipe: DatePipe = new DatePipe(navigator.language);
    //     let stringFormat: string = 'MMM y';
    //     let dateStr = datePipe.transform(startDate.toLocaleDateString(), stringFormat);
    //     this.loadingService.setLoadingMessage('Calculating Predictors: ' + dateStr + ' ...');

    //     //ISSUE: 1822
    //     let degreeDays: Array<DetailDegreeDay> = await getDetailedDataForMonth(weatherData, entryDate.getMonth(), entryDate.getFullYear(), this.weatherDataService.heatingTemp, this.weatherDataService.coolingTemp, this.weatherDataService.selectedStation.ID, this.weatherDataService.selectedStation.name)
    //     // let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDetailedDataForMonth(entryDate.getMonth(), this.weatherDataService.heatingTemp, this.weatherDataService.coolingTemp)
    //     let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
    //       return degreeDay.gapInData == true
    //     });
    //     if (cddPredictor) {
    //       let newCddPredictorData: IdbPredictorData = getNewIdbPredictorData(cddPredictor);
    //       newCddPredictorData.date = new Date(entryDate);
    //       newCddPredictorData.amount = getDegreeDayAmount(degreeDays, 'CDD');
    //       newCddPredictorData.weatherDataWarning = hasErrors != undefined;
    //       await firstValueFrom(this.predictorDataDbService.addWithObservable(newCddPredictorData));
    //     }

    //     if (hddPredictor) {
    //       let newHddPredictorData: IdbPredictorData = getNewIdbPredictorData(hddPredictor);
    //       newHddPredictorData.date = new Date(entryDate);
    //       newHddPredictorData.amount = getDegreeDayAmount(degreeDays, 'HDD');
    //       newHddPredictorData.weatherDataWarning = hasErrors != undefined;
    //       await firstValueFrom(this.predictorDataDbService.addWithObservable(newHddPredictorData));
    //     }

    //     if (relativeHumidityPredictor) {
    //       let newRHPredictorData: IdbPredictorData = getNewIdbPredictorData(relativeHumidityPredictor);
    //       newRHPredictorData.date = new Date(entryDate);
    //       newRHPredictorData.amount = getDegreeDayAmount(degreeDays, 'relativeHumidity');
    //       newRHPredictorData.weatherDataWarning = hasErrors != undefined;
    //       await firstValueFrom(this.predictorDataDbService.addWithObservable(newRHPredictorData));
    //     }

    //     if (dryBulbTempPredictor) {
    //       let newDryBulbTempPredictorData: IdbPredictorData = getNewIdbPredictorData(dryBulbTempPredictor);
    //       newDryBulbTempPredictorData.date = new Date(entryDate);
    //       newDryBulbTempPredictorData.amount = getDegreeDayAmount(degreeDays, 'dryBulbTemp');
    //       newDryBulbTempPredictorData.weatherDataWarning = hasErrors != undefined;
    //       await firstValueFrom(this.predictorDataDbService.addWithObservable(newDryBulbTempPredictorData));
    //     }
    //     startDate.setMonth(startDate.getMonth() + 1);
    //   }

    //   await this.dbChangesService.selectAccount(selectedAccount, true);
    if (results == "success") {
      this.loadingService.isLoadingComplete.next(true);
    } else {
      this.loadingService.isLoadingComplete.next(true);
      this.toastNotificationService.weatherDataErrorToast();
    }
  }

  navigateToUrl() {
    this.toastNotificationService.showToast('Degree Day Predictors Created', undefined, undefined, false, 'alert-success', false);
    if (this.router.url.includes('data-management')) {
      this.router.navigateByUrl('data-management/' + this.selectedFacility.accountId + '/facilities/' + this.selectedFacility.guid + '/predictors');
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/utility/predictors/manage/predictor-table');
    }
  }

  setFacilityData() {
    if (this.selectedFacility) {
      this.facilityPredictorData = this.predictorDataDbService.getByFacilityId(this.selectedFacility.guid);
      let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
      this.facilityMeterData = accountMeterData.filter(meterData => { return meterData.facilityId == this.selectedFacility.guid });
    } else {
      this.facilityPredictorData = [];
      this.facilityMeterData = [];
    }
  }

  setInDashboard(url: string) {
    this.inDashboard = url.includes('data-management') == false;
  }
}



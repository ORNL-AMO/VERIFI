import { Component } from '@angular/core';
import { HelpPanelService } from '../help-panel/help-panel.service';
import { AccountdbService } from '../indexedDB/account-db.service';
import { IdbPredictorEntry, PredictorData } from '../models/idb';
import { Subscription, firstValueFrom } from 'rxjs';
import { WeatherDataService } from './weather-data.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { PredictordbService } from '../indexedDB/predictors-db.service';
import { LoadingService } from '../core-components/loading/loading.service';
import { Router } from '@angular/router';
import { AnalysisDbService } from '../indexedDB/analysis-db.service';
import { ToastNotificationsService } from '../core-components/toast-notifications/toast-notifications.service';
import { WeatherDataSelection } from '../models/degreeDays';
import { UtilityMeterDatadbService } from '../indexedDB/utilityMeterData-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { CalanderizedMeter, MonthlyData } from '../models/calanderization';
import * as _ from 'lodash';
import { DbChangesService } from '../indexedDB/db-changes.service';
import { getCalanderizedMeterData } from '../calculations/calanderization/calanderizeMeters';
import { AnalyticsService } from '../analytics/analytics.service';
import { IdbAccount } from '../models/idbModels/account';
import { IdbFacility } from '../models/idbModels/facility';
import { IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { IdbUtilityMeter } from '../models/idbModels/utilityMeter';

@Component({
  selector: 'app-weather-data',
  templateUrl: './weather-data.component.html',
  styleUrls: ['./weather-data.component.css']
})
export class WeatherDataComponent {

  applyToFacility: boolean;
  applyToFacilitySub: Subscription;
  selectedFacility: IdbFacility;
  facilities: Array<IdbFacility>;
  weatherDataSelection: WeatherDataSelection;
  facilityPredictorEntries: Array<IdbPredictorEntry>;
  facilityMeterData: Array<IdbUtilityMeterData>;
  constructor(private helpPanelService: HelpPanelService, private accountDbService: AccountdbService,
    private weatherDataService: WeatherDataService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private loadingService: LoadingService,
    private router: Router,
    private analysisDbService: AnalysisDbService,
    private toastNotificationService: ToastNotificationsService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private dbChangesService: DbChangesService,
    private analyticsService: AnalyticsService) {

  }

  ngOnInit() {
    this.applyToFacilitySub = this.weatherDataService.applyToFacility.subscribe(val => {
      this.applyToFacility = val;
      if (this.applyToFacility) {
        this.weatherDataSelection = this.weatherDataService.weatherDataSelection;
        this.facilities = this.facilityDbService.accountFacilities.getValue();
        if (this.weatherDataService.selectedFacility) {
          let facilityExists: IdbFacility = this.facilities.find(facility => { return facility.guid == this.weatherDataService.selectedFacility.guid });
          if (facilityExists) {
            this.selectedFacility = this.weatherDataService.selectedFacility;
            this.setFacilityData();
          }
        }
      }
    });
  }

  ngOnDestroy() {
    this.applyToFacilitySub.unsubscribe();
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }

  cancelApplyToFacility() {
    this.weatherDataService.applyToFacility.next(false);
  }

  async confirmCreate() {
    this.analyticsService.sendEvent('weather_data_predictors');
    this.weatherDataService.applyToFacility.next(false);
    this.loadingService.setLoadingMessage('Updating Predictors...');
    this.loadingService.setLoadingStatus(true);
    let facilityPredictors: Array<PredictorData> = [];
    if (this.facilityPredictorEntries.length > 0) {
      facilityPredictors = this.facilityPredictorEntries[0].predictors
    } else {
      let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
      let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.selectedFacility.guid });
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
      let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, meterData, this.selectedFacility, false, undefined, [], [], [this.selectedFacility]);
      let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(cMeter => { return cMeter.monthlyData });
      monthlyData = _.orderBy(monthlyData, (dataItem: MonthlyData) => { return dataItem.date });
      let startDate: Date = new Date(monthlyData[0].date);
      let endDate: Date = new Date(monthlyData[monthlyData.length - 1].date);
      while (startDate <= endDate) {
        let newIdbPredictorEntry: IdbPredictorEntry = this.predictorDbService.getNewIdbPredictorEntry(this.selectedFacility.guid, this.selectedFacility.accountId, new Date(startDate));
        await firstValueFrom(this.predictorDbService.addWithObservable(newIdbPredictorEntry));
        startDate.setMonth(startDate.getMonth() + 1);
      }
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      await this.dbChangesService.setPredictors(selectedAccount, this.selectedFacility)
    }
    let facilityPredictorsCopy: Array<PredictorData> = JSON.parse(JSON.stringify(facilityPredictors));
    let hddPredictor: PredictorData;
    let cddPredictor: PredictorData;
    if (this.weatherDataSelection == 'HDD' || this.weatherDataSelection == 'degreeDays') {
      hddPredictor = this.predictorDbService.getNewPredictor(facilityPredictorsCopy);
      hddPredictor.name = 'HDD Generated ' + '(' + this.weatherDataService.heatingTemp + "F)";
      hddPredictor.predictorType = 'Weather';
      hddPredictor.weatherDataType = 'HDD';
      hddPredictor.heatingBaseTemperature = this.weatherDataService.heatingTemp;
      hddPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
      facilityPredictorsCopy.push(hddPredictor);
    }
    if (this.weatherDataSelection == 'CDD' || this.weatherDataSelection == 'degreeDays') {
      cddPredictor = this.predictorDbService.getNewPredictor(facilityPredictorsCopy)
      cddPredictor.name = 'CDD Generated ' + '(' + this.weatherDataService.coolingTemp + "F)";
      cddPredictor.predictorType = 'Weather';
      cddPredictor.weatherDataType = 'CDD';
      cddPredictor.coolingBaseTemperature = this.weatherDataService.coolingTemp;
      cddPredictor.weatherStationId = this.weatherDataService.selectedStation.ID;
      facilityPredictorsCopy.push(cddPredictor);
    }

    await this.predictorDbService.updateFacilityPredictorEntriesInAccount(facilityPredictorsCopy, this.selectedFacility);
    await this.predictorDbService.createPredictorHeatingCoolingDegreeDays(this.selectedFacility, hddPredictor, cddPredictor);
    this.loadingService.setLoadingMessage('Updating Analysis Items...');
    await this.analysisDbService.updateAnalysisPredictors(facilityPredictorsCopy, this.selectedFacility.guid);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Degree Day Predictors Created', undefined, undefined, false, 'alert-success', false);
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/utility/predictors/manage/predictor-table');
  }

  setFacilityData() {
    if (this.selectedFacility) {
      let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
      this.facilityPredictorEntries = accountPredictorEntries.filter(entry => { return entry.facilityId == this.selectedFacility.guid });
      let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
      this.facilityMeterData = accountMeterData.filter(meterData => { return meterData.facilityId == this.selectedFacility.guid });
    } else {
      this.facilityPredictorEntries = [];
      this.facilityMeterData = [];
    }
  }
}



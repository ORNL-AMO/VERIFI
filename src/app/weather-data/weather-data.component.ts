import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { WeatherDataService } from './weather-data.service';
import { LoadingService } from '../core-components/loading/loading.service';
import { NavigationEnd, Router } from '@angular/router';
import { ToastNotificationsService } from '../core-components/toast-notifications/toast-notifications.service';
import { WeatherDataSelection } from '../models/degreeDays';
import { AnalyticsService } from '../analytics/analytics.service';
import { IdbFacility } from '../models/idbModels/facility';
import { IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { IdbPredictorData } from '../models/idbModels/predictorData';
import { WeatherPredictorManagementService } from './weather-predictor-management.service';
// import { DegreeDaysService } from '../shared/helper-services/degree-days.service';

@Component({
  selector: 'app-weather-data',
  templateUrl: './weather-data.component.html',
  styleUrls: ['./weather-data.component.css'],
  standalone: false
})
export class WeatherDataComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

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
  wetBulbTempSelected: boolean = false;
  dewPointTempSelected: boolean = false;
  precipitationSelected: boolean = false;
  cddBaseTemp: number;
  hddBaseTemp: number;
  selectedValues: Array<{ name: WeatherDataSelection, value?: number }> = [];
  loadingSub: Subscription;

  constructor(
    private weatherDataService: WeatherDataService,
    private loadingService: LoadingService,
    private router: Router,
    private toastNotificationService: ToastNotificationsService,
    private analyticsService: AnalyticsService,
    private weatherPredictorManagementService: WeatherPredictorManagementService

  ) {

  }

  ngOnInit() {
    this.applyToFacilitySub = this.weatherDataService.applyToFacility.subscribe(val => {
      this.applyToFacility = val;
      if (this.applyToFacility) {
        this.weatherDataSelection = this.weatherDataService.weatherDataSelection;
        this.facilities = [...this.accountWorkspaceStore.facilities()];
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
    this.wetBulbTempSelected = false;
    this.dewPointTempSelected = false;
    this.precipitationSelected = false;
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
      case 'wetBulbTemp':
        this.wetBulbTempSelected = true;
        break;
      case 'dewPointTemp':
        this.dewPointTempSelected = true;
        break;
      case 'precipitation':
        this.precipitationSelected = true;
        break;
    }
  }

  isButtonDisabled(): boolean {
    if (!this.selectedFacility || this.facilityMeterData?.length == 0) {
      return true;
    }
    if (!this.cddSelected && !this.hddSelected && !this.relativeHumiditySelected && !this.dryBulbTempSelected && !this.wetBulbTempSelected && !this.dewPointTempSelected && !this.precipitationSelected) {
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
    if (this.wetBulbTempSelected) {
      this.selectedValues.push({ name: 'wetBulbTemp' });
    }
    if (this.dewPointTempSelected) {
      this.selectedValues.push({ name: 'dewPointTemp' });
    }
    if (this.precipitationSelected) {
      this.selectedValues.push({ name: 'precipitation' });
    }
  }

  async confirmCreate() {
    this.setSelectedValues();
    this.analyticsService.sendEvent('weather_data_predictors');
    this.weatherDataService.applyToFacility.next(false);
    this.loadingService.setContext('create-weather-predictors');
    this.loadingService.setTitle('Create Weather Predictors');
    this.weatherPredictorManagementService.setLoadingMessages(this.selectedFacility);
    this.loadingService.setCurrentLoadingIndex(0);
    const facility = this.selectedFacility;
    const selectedValues = this.selectedValues;
    let results: string = await this.weatherPredictorManagementService.createPredictorsFromWeatherDataPage(facility, selectedValues);
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
      this.facilityPredictorData = this.accountWorkspaceQuery.getFacilityPredictorData(this.selectedFacility.guid);
      let accountMeterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.meterData()];
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

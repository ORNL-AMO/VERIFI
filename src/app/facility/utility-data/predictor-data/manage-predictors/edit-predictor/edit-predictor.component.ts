import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbServiceDeprecated } from 'src/app/indexedDB/predictors-db.service';
import { IdbAccount, IdbFacility, IdbPredictorEntryDeprecated, IdbUtilityMeter, IdbUtilityMeterData, PredictorDataDeprecated } from 'src/app/models/idb';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { UnitConversionTypes } from './unitConversionTypes';
import { WeatherStation } from 'src/app/models/degreeDays';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { firstValueFrom, Observable, of } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { AnalyticsService } from 'src/app/analytics/analytics.service';

@Component({
  selector: 'app-edit-predictor',
  templateUrl: './edit-predictor.component.html',
  styleUrls: ['./edit-predictor.component.css']
})
export class EditPredictorComponent {


  addOrEdit: 'add' | 'edit';
  predictorData: PredictorDataDeprecated;
  predictorForm: FormGroup;
  showReferencePredictors: boolean;
  referencePredictors: Array<PredictorDataDeprecated>;
  unitConversionTypes: Array<{ measure: string, display: string }> = UnitConversionTypes;
  unitOptions: Array<string> = [];
  referencePredictorName: string;
  stations: Array<WeatherStation> = [];
  facility: IdbFacility;
  facilityPredictorsEntries: Array<IdbPredictorEntryDeprecated>;
  constructor(private activatedRoute: ActivatedRoute, private predictorDbService: PredictordbServiceDeprecated,
    private router: Router, private facilityDbService: FacilitydbService,
    private formBuilder: FormBuilder,
    private weatherDataService: WeatherDataService,
    private degreeDaysService: DegreeDaysService,
    private loadingService: LoadingService,
    private analysisDbService: AnalysisDbService,
    private toastNotificationService: ToastNotificationsService,
    private utilityMeterDbService: UtilityMeterdbService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private analyticsService: AnalyticsService) {
  }

  ngOnInit() {
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.facilityPredictorsEntries = this.predictorDbService.facilityPredictorEntries.getValue();
    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      if (predictorId) {
        this.addOrEdit = 'edit';
        this.setPredictorDataEdit(predictorId);
      } else {
        this.addOrEdit = 'add';
        this.setPredictorDataNew();
      }
      this.setReferencePredictors();
      this.setStations();
    });
  }

  setPredictorDataEdit(predictorId: string) {
    let facilityPredictors: Array<PredictorDataDeprecated> = this.predictorDbService.facilityPredictors.getValue();
    let predictorData: PredictorDataDeprecated = facilityPredictors.find(predictor => { return predictor.id == predictorId });
    this.predictorData = JSON.parse(JSON.stringify(predictorData));
    this.setPredictorForm();
  }

  setPredictorDataNew() {
    let facilityPredictors: Array<PredictorDataDeprecated> = this.predictorDbService.facilityPredictors.getValue();
    this.predictorData = this.predictorDbService.getNewPredictor(facilityPredictors);
    this.setPredictorForm();
  }

  changePredictorType() {
    this.setValidators();
    this.setShowReferencePredictors();
  }

  setPredictorForm() {
    this.predictorForm = this.formBuilder.group({
      'name': [this.predictorData.name, [Validators.required]],
      'unit': [this.predictorData.unit],
      'description': [this.predictorData.description],
      'production': [this.predictorData.production || false],
      'predictorType': [this.predictorData.predictorType],
      'referencePredictorId': [this.predictorData.referencePredictorId],
      'convertFrom': [this.predictorData.convertFrom],
      'convertTo': [this.predictorData.convertTo],
      'conversionType': [this.predictorData.conversionType],
      'mathAction': [],
      'mathAmount': [],
      'weatherDataType': [this.predictorData.weatherDataType],
      'heatingBaseTemperature': [this.predictorData.heatingBaseTemperature],
      'coolingBaseTemperature': [this.predictorData.coolingBaseTemperature],
      'weatherStationId': [this.predictorData.weatherStationId]
    });
    this.setShowReferencePredictors()
    // this.setUnitOptions();
    this.setValidators();
  }



  setValidators() {
    if (this.predictorForm.controls.predictorType.value == 'Standard') {
      this.predictorForm.controls.heatingBaseTemperature.setValidators([]);
      this.predictorForm.controls.coolingBaseTemperature.setValidators([]);
      this.predictorForm.controls.weatherStationId.setValidators([]);
      this.predictorForm.controls.weatherDataType.setValidators([]);
    } else if (this.predictorForm.controls.predictorType.value == 'Weather') {
      this.predictorForm.controls.weatherStationId.setValidators([Validators.required]);
      this.predictorForm.controls.weatherDataType.setValidators([Validators.required]);
      if (this.predictorForm.controls.weatherDataType.value == 'HDD') {
        this.predictorForm.controls.heatingBaseTemperature.setValidators([Validators.required]);
        this.predictorForm.controls.coolingBaseTemperature.setValidators([]);
      } else if (this.predictorForm.controls.weatherDataType.value == 'CDD') {
        this.predictorForm.controls.heatingBaseTemperature.setValidators([]);
        this.predictorForm.controls.coolingBaseTemperature.setValidators([Validators.required]);
      }
    }
    this.predictorForm.controls.heatingBaseTemperature.updateValueAndValidity();
    this.predictorForm.controls.coolingBaseTemperature.updateValueAndValidity();
    this.predictorForm.controls.weatherStationId.updateValueAndValidity();
    this.predictorForm.controls.weatherDataType.updateValueAndValidity();
  }

  cancel() {
    this.router.navigateByUrl('facility/' + this.facility.id + '/utility/predictors/manage/predictor-table')
  }

  setPredictorDataFromForm(): boolean {
    this.predictorData.name = this.predictorForm.controls.name.value;
    this.predictorData.unit = this.predictorForm.controls.unit.value;
    this.predictorData.description = this.predictorForm.controls.description.value;
    this.predictorData.production = this.predictorForm.controls.production.value;
    this.predictorData.predictorType = this.predictorForm.controls.predictorType.value;
    this.predictorData.referencePredictorId = this.predictorForm.controls.referencePredictorId.value;
    this.predictorData.convertFrom = this.predictorForm.controls.convertFrom.value;
    this.predictorData.convertTo = this.predictorForm.controls.convertTo.value;
    this.predictorData.conversionType = this.predictorForm.controls.conversionType.value;
    // this.predictorData.mathAction = this.predictorForm.controls.name.value;
    // this.predictorData.mathAmount = this.predictorForm.controls.name.value;

    let weatherDataChange: boolean = false;
    if (this.predictorData.weatherDataType != this.predictorForm.controls.weatherDataType.value) {
      weatherDataChange = true;
      this.predictorData.weatherDataType = this.predictorForm.controls.weatherDataType.value;
    }
    if (this.predictorData.heatingBaseTemperature != this.predictorForm.controls.heatingBaseTemperature.value) {
      weatherDataChange = true;
      this.predictorData.heatingBaseTemperature = this.predictorForm.controls.heatingBaseTemperature.value;
    }
    if (this.predictorData.coolingBaseTemperature != this.predictorForm.controls.coolingBaseTemperature.value) {
      weatherDataChange = true;
      this.predictorData.coolingBaseTemperature = this.predictorForm.controls.coolingBaseTemperature.value;
    }
    if (this.predictorData.weatherStationId != this.predictorForm.controls.weatherStationId.value) {
      weatherDataChange = true;
      this.predictorData.weatherStationId = this.predictorForm.controls.weatherStationId.value;
    }
    return weatherDataChange;
  }

  async saveChanges(goToEntries?: boolean) {
    // this.loadingService.setLoadingMessage('Updating Predictors...');
    // this.loadingService.setLoadingStatus(true);
    // let needsWeatherDataUpdate: boolean = this.setPredictorDataFromForm();
    // this.predictorForm.markAsPristine();
    // let facilityPredictors: Array<PredictorDataDeprecated> = this.predictorDbService.facilityPredictors.getValue();
    // let facilityPredictorsCopy: Array<PredictorDataDeprecated> = JSON.parse(JSON.stringify(facilityPredictors));
    // if (this.addOrEdit == 'add') {
    //   facilityPredictorsCopy.push(this.predictorData);
    //   await this.predictorDbService.updateFacilityPredictorEntries(facilityPredictorsCopy);
    // } else {
    //   let editPredictorIndex: number = facilityPredictorsCopy.findIndex(predictorCopy => { return predictorCopy.id == this.predictorData.id });
    //   facilityPredictorsCopy[editPredictorIndex] = this.predictorData;
    //   await this.predictorDbService.updateFacilityPredictorEntries(facilityPredictorsCopy);
    // }
    // if (this.predictorData.predictorType == 'Weather' && needsWeatherDataUpdate) {
    //   await this.predictorDbService.updatePredictorDegreeDays(this.facility, this.predictorData);
    // }
    // await this.analysisDbService.updateAnalysisPredictors(facilityPredictorsCopy, this.facility.guid);
    // this.loadingService.setLoadingStatus(false);
    // this.toastNotificationService.showToast('Predictor Entries Updated!', undefined, undefined, false, 'alert-success');
    // if (!goToEntries) {
    //   this.cancel();
    // } else {
    //   this.router.navigateByUrl('facility/' + this.facility.id + '/utility/predictors/entries')
    // }
  }

  setShowReferencePredictors() {
    this.showReferencePredictors = this.predictorForm.controls.predictorType.value == 'Conversion' || this.predictorForm.controls.predictorType.value == 'Math';
  }

  setReferencePredictors() {
    let facilityPredictors: Array<PredictorDataDeprecated> = this.predictorDbService.facilityPredictors.getValue();
    this.referencePredictors = facilityPredictors.filter(predictor => { return predictor.id != this.predictorData.id });
  }

  //conversion method not implemented yet. Unneeded
  // setUnitOptions() {
  //   if (this.predictorForm.controls.conversionType.value) {
  //     this.unitOptions = this.convertUnitsService.possibilities(this.predictorForm.controls.conversionType.value);
  //   } else {
  //     this.unitOptions = [];
  //   }
  // }

  setReferencePredictorName() {
    let facilityPredictors: Array<PredictorDataDeprecated> = this.predictorDbService.facilityPredictors.getValue();
    let referencePredictor: PredictorDataDeprecated = facilityPredictors.find(predictor => { return predictor.id == this.predictorForm.controls.referencePredictorId.value });
    if (referencePredictor) {
      this.referencePredictorName = referencePredictor.name;
    }
  }

  setStations() {
    this.degreeDaysService.getClosestStation(this.facility.zip, 50).then(stations => {
      this.stations = stations;
    });
  }

  goToWeatherData() {
    this.weatherDataService.zipCode = this.facility.zip;
    let weatherStation: WeatherStation = this.stations.find(station => {
      return station.ID == this.predictorForm.controls.weatherStationId.value
    });
    this.weatherDataService.selectedStation = weatherStation;
    if (this.predictorForm.controls.weatherDataType.value == 'CDD') {
      this.weatherDataService.coolingTemp = this.predictorForm.controls.coolingBaseTemperature.value;
      this.weatherDataService.weatherDataSelection = 'CDD';
    } else {
      this.weatherDataService.heatingTemp = this.predictorForm.controls.heatingBaseTemperature.value;
      this.weatherDataService.weatherDataSelection = 'HDD';
    }

    this.weatherDataService.selectedFacility = this.facility;
    this.weatherDataService.zipCode = this.facility.zip;
    if (weatherStation) {
      let endDate: Date = new Date(weatherStation.end);
      endDate.setFullYear(endDate.getFullYear() - 1);
      this.weatherDataService.selectedYear = endDate.getFullYear();
      this.weatherDataService.selectedDate = endDate;
      this.weatherDataService.selectedMonth = endDate;
      this.router.navigateByUrl('/weather-data/annual-station');
    } else {
      this.router.navigateByUrl('/weather-data');
    }
  }

  goToPredictorEntry() {
    this.setPredictorDataFromForm();
    let facilityPredictors: Array<PredictorDataDeprecated> = this.predictorDbService.facilityPredictors.getValue();
    facilityPredictors.push(this.predictorData);
    this.predictorDbService.facilityPredictors.next(facilityPredictors);
    this.router.navigateByUrl('facility/' + this.facility.id + '/utility/predictors/entries/add-entry');
  }

  async generateWeatherData() {
    this.analyticsService.sendEvent('weather_data_predictors');
    this.loadingService.setLoadingMessage('Updating Predictors...');
    this.loadingService.setLoadingStatus(true);
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.guid });
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(facilityMeters, meterData, this.facility, false, undefined, [], [], [this.facility]);
    let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(cMeter => { return cMeter.monthlyData });
    monthlyData = _.orderBy(monthlyData, (dataItem: MonthlyData) => { return dataItem.date });
    let startDate: Date = new Date(monthlyData[0].date);
    let endDate: Date = new Date(monthlyData[monthlyData.length - 1].date);
    while (startDate <= endDate) {
      let newIdbPredictorEntry: IdbPredictorEntryDeprecated = this.predictorDbService.getNewIdbPredictorEntry(this.facility.guid, this.facility.accountId, new Date(startDate));
      await firstValueFrom(this.predictorDbService.addWithObservable(newIdbPredictorEntry));
      startDate.setMonth(startDate.getMonth() + 1);
    }
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setPredictorsDeprecated(selectedAccount, this.facility)
    this.saveChanges();
  }

  canDeactivate(): Observable<boolean> {
    if (this.predictorForm.dirty) {
      const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
      return of(result);
    }
    return of(true);
  }
}

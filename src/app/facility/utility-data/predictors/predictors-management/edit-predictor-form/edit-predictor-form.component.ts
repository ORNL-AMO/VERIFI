import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { getNewIdbPredictor, IdbPredictor } from 'src/app/models/idbModels/predictor';
import { UnitConversionTypes } from './unitConversionTypes';
import { WeatherStation } from 'src/app/models/degreeDays';
import { ActivatedRoute, Router } from '@angular/router';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { firstValueFrom, Observable, of } from 'rxjs';
import * as _ from 'lodash';

@Component({
  selector: 'app-edit-predictor-form',
  templateUrl: './edit-predictor-form.component.html',
  styleUrl: './edit-predictor-form.component.css'
})
export class EditPredictorFormComponent {

  addOrEdit: 'add' | 'edit';
  predictor: IdbPredictor;
  predictorForm: FormGroup;
  showReferencePredictors: boolean;
  referencePredictors: Array<IdbPredictor>;
  unitConversionTypes: Array<{ measure: string, display: string }> = UnitConversionTypes;
  unitOptions: Array<string> = [];
  referencePredictorName: string;
  stations: Array<WeatherStation> = [];
  facility: IdbFacility;
  findingStations: boolean = false;
  // facilityPredictorsEntries: Array<IdbPredictorEntry>;
  constructor(private activatedRoute: ActivatedRoute, private predictorDbService: PredictorDbService,
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
    // this.facilityPredictorsEntries = this.predictorDbService.facilityPredictorEntries.getValue();
    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      if (predictorId) {
        this.addOrEdit = 'edit';
        this.setPredictorDataEdit(predictorId);
      } else {
        this.addOrEdit = 'add';
        this.setPredictorDataNew();
      }
      if (this.predictor) {
        this.setReferencePredictors();
        this.setStations();
      }
    });
  }

  setPredictorDataEdit(predictorId: string) {
    let predictorData: IdbPredictor = this.predictorDbService.getByGuid(predictorId);
    if (predictorData) {
      this.predictor = JSON.parse(JSON.stringify(predictorData));
      this.setPredictorForm();
    } else {
      this.toastNotificationService.showToast('Predictor Not Found', undefined, 2000, false, 'alert-danger');
      this.cancel();
    }
  }

  setPredictorDataNew() {
    this.predictor = getNewIdbPredictor(this.facility.accountId, this.facility.guid);
    this.setPredictorForm();
  }

  changePredictorType() {
    this.setValidators();
    this.setShowReferencePredictors();
  }

  setPredictorForm() {
    this.predictorForm = this.formBuilder.group({
      'name': [this.predictor.name, [Validators.required]],
      'unit': [this.predictor.unit],
      'description': [this.predictor.description],
      'production': [this.predictor.production || false],
      'predictorType': [this.predictor.predictorType],
      'referencePredictorId': [this.predictor.referencePredictorId],
      'convertFrom': [this.predictor.convertFrom],
      'convertTo': [this.predictor.convertTo],
      'conversionType': [this.predictor.conversionType],
      'mathAction': [],
      'mathAmount': [],
      'weatherDataType': [this.predictor.weatherDataType],
      'heatingBaseTemperature': [this.predictor.heatingBaseTemperature],
      'coolingBaseTemperature': [this.predictor.coolingBaseTemperature],
      'weatherStationId': [this.predictor.weatherStationId]
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
    this.predictor.name = this.predictorForm.controls.name.value;
    this.predictor.unit = this.predictorForm.controls.unit.value;
    this.predictor.description = this.predictorForm.controls.description.value;
    this.predictor.production = this.predictorForm.controls.production.value;
    this.predictor.predictorType = this.predictorForm.controls.predictorType.value;
    this.predictor.referencePredictorId = this.predictorForm.controls.referencePredictorId.value;
    this.predictor.convertFrom = this.predictorForm.controls.convertFrom.value;
    this.predictor.convertTo = this.predictorForm.controls.convertTo.value;
    this.predictor.conversionType = this.predictorForm.controls.conversionType.value;
    // this.predictorData.mathAction = this.predictorForm.controls.name.value;
    // this.predictorData.mathAmount = this.predictorForm.controls.name.value;

    let weatherDataChange: boolean = false;
    if (this.predictor.weatherDataType != this.predictorForm.controls.weatherDataType.value) {
      weatherDataChange = true;
      this.predictor.weatherDataType = this.predictorForm.controls.weatherDataType.value;
    }
    if (this.predictor.heatingBaseTemperature != this.predictorForm.controls.heatingBaseTemperature.value) {
      weatherDataChange = true;
      this.predictor.heatingBaseTemperature = this.predictorForm.controls.heatingBaseTemperature.value;
    }
    if (this.predictor.coolingBaseTemperature != this.predictorForm.controls.coolingBaseTemperature.value) {
      weatherDataChange = true;
      this.predictor.coolingBaseTemperature = this.predictorForm.controls.coolingBaseTemperature.value;
    }
    if (this.predictor.weatherStationId != this.predictorForm.controls.weatherStationId.value) {
      weatherDataChange = true;
      this.predictor.weatherStationId = this.predictorForm.controls.weatherStationId.value;
    }
    if (this.predictor.predictorType == 'Weather') {
      this.predictor.weatherStationName = this.stations.find(station => {
        return station.ID == this.predictor.weatherStationId;
      })?.name;
    }
    return weatherDataChange;
  }

  async saveChanges(goToEntries?: boolean) {
    //TODO: update save method..
    this.loadingService.setLoadingMessage('Updating Predictors...');
    this.loadingService.setLoadingStatus(true);
    let needsWeatherDataUpdate: boolean = this.setPredictorDataFromForm();
    this.predictorForm.markAsPristine();
    // let facilityPredictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    // let facilityPredictorsCopy: Array<PredictorData> = JSON.parse(JSON.stringify(facilityPredictors));
    if (this.addOrEdit == 'add') {
      await firstValueFrom(this.predictorDbService.addWithObservable(this.predictor));
      //   facilityPredictorsCopy.push(this.predictorData);
      //   await this.predictorDbService.updateFacilityPredictorEntries(facilityPredictorsCopy);
    } else {
      await firstValueFrom(this.predictorDbService.updateWithObservable(this.predictor));
      //   let editPredictorIndex: number = facilityPredictorsCopy.findIndex(predictorCopy => { return predictorCopy.id == this.predictorData.id });
      //   facilityPredictorsCopy[editPredictorIndex] = this.predictorData;
      //   await this.predictorDbService.updateFacilityPredictorEntries(facilityPredictorsCopy);
    }
    // if (this.predictorData.predictorType == 'Weather' && needsWeatherDataUpdate) {
    //   await this.predictorDbService.updatePredictorDegreeDays(this.facility, this.predictorData);
    // }
    // await this.analysisDbService.updateAnalysisPredictors(facilityPredictorsCopy, this.facility.guid);
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setPredictorsV2(account, this.facility);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Predictor Entries Updated!', undefined, undefined, false, 'alert-success');
    this.cancel();
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
    let facilityPredictors: Array<IdbPredictor> = this.predictorDbService.facilityPredictors.getValue();
    this.referencePredictors = facilityPredictors.filter(predictor => { return predictor.id != this.predictor.id });
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
    let facilityPredictors: Array<IdbPredictor> = this.predictorDbService.facilityPredictors.getValue();
    let referencePredictor: IdbPredictor = facilityPredictors.find(predictor => { return predictor.id == this.predictorForm.controls.referencePredictorId.value });
    if (referencePredictor) {
      this.referencePredictorName = referencePredictor.name;
    }
  }

  setStations() {
    this.findingStations = true;
    this.degreeDaysService.getClosestStation(this.facility.zip, 50).then(stations => {
      this.stations = stations;
      this.findingStations = false;
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

  // goToPredictorEntry() {
  //   this.setPredictorDataFromForm();
  //   let facilityPredictors: Array<IdbPredictor> = this.predictorDbService.facilityPredictors.getValue();
  //   facilityPredictors.push(this.predictorData);
  //   this.predictorDbService.facilityPredictors.next(facilityPredictors);
  //   this.router.navigateByUrl('facility/' + this.facility.id + '/utility/predictors/entries/add-entry');
  // }

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
    //TODO: Add/Edit predictor data
    // while (startDate <= endDate) {
    //   let newIdbPredictorEntry: IdbPredictorEntry = this.predictorDbService.getNewIdbPredictorEntry(this.facility.guid, this.facility.accountId, new Date(startDate));
    //   await firstValueFrom(this.predictorDbService.addWithObservable(newIdbPredictorEntry));
    //   startDate.setMonth(startDate.getMonth() + 1);
    // }
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setPredictorsDeprecated(selectedAccount, this.facility)
    this.saveChanges();
  }

  canDeactivate(): Observable<boolean> {
    if (this.predictorForm && this.predictorForm.dirty) {
      const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
      return of(result);
    }
    return of(true);
  }
}

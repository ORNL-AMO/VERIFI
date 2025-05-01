import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { getNewIdbPredictor, IdbPredictor } from 'src/app/models/idbModels/predictor';
import { UnitConversionTypes } from './unitConversionTypes';
import { DetailDegreeDay, WeatherStation } from 'src/app/models/degreeDays';
import { ActivatedRoute, Router } from '@angular/router';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { getWeatherStation, WeatherDataReading, WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { firstValueFrom, Observable, of } from 'rxjs';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { getNewIdbPredictorData, IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { getDegreeDayAmount, getWeatherSearchFromFacility } from 'src/app/shared/sharedHelperFuntions';
import { PredictorDataHelperService } from 'src/app/shared/helper-services/predictor-data-helper.service';
import { DatePipe } from '@angular/common';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { getDetailedDataForMonth } from 'src/app/weather-data/weatherDataCalculations';
import * as _ from 'lodash';
// import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';

@Component({
  selector: 'app-edit-predictor-form',
  templateUrl: './edit-predictor-form.component.html',
  styleUrl: './edit-predictor-form.component.css',
  standalone: false
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
  facility: IdbFacility;
  findingStations: boolean = false;
  latestMeterReading: Date;
  firstMeterReading: Date;
  destroyed: boolean;

  displaySationModal: boolean = false;
  constructor(private activatedRoute: ActivatedRoute, private predictorDbService: PredictorDbService,
    private router: Router, private facilityDbService: FacilitydbService,
    private formBuilder: FormBuilder,
    private weatherDataService: WeatherDataService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private predictorDataDbService: PredictorDataDbService,
    private predictorDataHelperService: PredictorDataHelperService,
    private analysisDbService: AnalysisDbService,
    // private degreeDaysService: DegreeDaysService
  ) {
  }

  ngOnInit() {
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.setLastMeterReading();
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
      }
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
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
      'weatherStationId': [this.predictor.weatherStationId],
      'createPredictorData': [true]
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
      } else {
        this.predictorForm.controls.heatingBaseTemperature.setValidators([]);
        this.predictorForm.controls.coolingBaseTemperature.setValidators([]);
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
    return weatherDataChange;
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Updating Predictors...');
    this.loadingService.setLoadingStatus(true);
    let needsWeatherDataUpdate: boolean = this.setPredictorDataFromForm();
    this.predictorForm.markAsPristine();
    if (this.addOrEdit == 'add') {
      await firstValueFrom(this.predictorDbService.addWithObservable(this.predictor));
    } else {
      await firstValueFrom(this.predictorDbService.updateWithObservable(this.predictor));
    }
    if (this.predictor.predictorType == 'Weather') {
      if (this.addOrEdit == 'edit' && needsWeatherDataUpdate) {
        let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByPredictorId(this.predictor.guid);
        //ISSUE 1822
        let predictorDates: Array<Date> = predictorData.map(pData => { return new Date(pData.date) })
        let minDate: Date = _.min(predictorDates);
        let maxDate: Date = _.max(predictorDates);
        let parsedData: Array<WeatherDataReading> | 'error' = await this.weatherDataService.getHourlyData(this.predictor.weatherStationId, minDate, maxDate, ['humidity']);
        if (parsedData != 'error') {
          for (let i = 0; i < predictorData.length; i++) {
            if (!predictorData[i].weatherOverride) {
              let entryDate: Date = new Date(predictorData[i].date);
              this.loadingService.setLoadingMessage('Updating Weather Predictors: (' + i + '/' + predictorData.length + ')');
              // await this.degreeDaysService.setYearHourlyData(entryDate.getMonth(), entryDate.getFullYear(), this.weatherDataService.selectedStation.ID)
              // let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDetailedDataForMonth(entryDate.getMonth(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature)
              let degreeDays: Array<DetailDegreeDay> = getDetailedDataForMonth(parsedData, entryDate.getMonth(), entryDate.getFullYear(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature, this.predictor.weatherStationId, this.predictor.weatherStationName);
              let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
                return degreeDay.gapInData == true
              });
              predictorData[i].amount = getDegreeDayAmount(degreeDays, this.predictor.weatherDataType);
              predictorData[i].weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
              await firstValueFrom(this.predictorDataDbService.updateWithObservable(predictorData[i]));
            }
          }
        } else {
          this.toastNotificationService.weatherDataErrorToast();
        }
      } else if (this.addOrEdit == 'add' && this.predictorForm.controls.createPredictorData.value) {
        await this.addWeatherData();
      }
    }

    if (this.addOrEdit == 'add') {
      await this.analysisDbService.addAnalysisPredictor(this.predictor);
    } else {
      await this.analysisDbService.updateAnalysisPredictor(this.predictor);
    }
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setPredictorsV2(account, this.facility);
    await this.dbChangesService.setPredictorDataV2(account, this.facility);
    await this.dbChangesService.setAnalysisItems(account, true, this.facility);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Predictor Entries Updated!', undefined, undefined, false, 'alert-success');
    this.cancel();
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

  async goToWeatherData() {
    this.displaySationModal = false;
    if (this.predictorForm.controls.weatherDataType.value == 'CDD') {
      this.weatherDataService.coolingTemp = this.predictorForm.controls.coolingBaseTemperature.value;
    } else if (this.predictorForm.controls.weatherDataType.value == 'HDD') {
      this.weatherDataService.heatingTemp = this.predictorForm.controls.heatingBaseTemperature.value;
    }
    this.weatherDataService.weatherDataSelection = this.predictorForm.controls.weatherDataType.value;
    this.weatherDataService.selectedFacility = this.facility;
    this.weatherDataService.addressSearchStr = getWeatherSearchFromFacility(this.facility);
    let weatherStation: WeatherStation | "error" = await this.weatherDataService.getStation(this.predictorForm.controls.weatherStationId.value)
    if (weatherStation && weatherStation != 'error') {
      this.weatherDataService.selectedStation = weatherStation;
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

  canDeactivate(): Observable<boolean> {
    if (this.predictorForm && this.predictorForm.dirty) {
      const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
      return of(result);
    }
    return of(true);
  }

  setLastMeterReading() {
    this.latestMeterReading = this.predictorDataHelperService.getLastMeterDate(this.facility);
    this.firstMeterReading = this.predictorDataHelperService.getFirstMeterDate(this.facility);
  }

  async addWeatherData() {
    if (this.latestMeterReading && this.firstMeterReading) {
      let datePipe: DatePipe = new DatePipe(navigator.language);
      let stringFormat: string = 'MMM, yyyy';
      let startDate: Date = new Date(this.firstMeterReading);
      let endDate: Date = new Date(this.latestMeterReading);
      let parsedData: Array<WeatherDataReading> | 'error' = await this.weatherDataService.getHourlyData(this.predictor.weatherStationId, startDate, endDate, []);
      if (parsedData != 'error') {
        while (startDate <= endDate) {
          if (this.destroyed) {
            break;
          }
          let newDate: Date = new Date(startDate);
          let dateString = datePipe.transform(newDate, stringFormat);
          this.loadingService.setLoadingMessage('Adding Weather Predictors: ' + dateString);
          let degreeDays: Array<DetailDegreeDay> = getDetailedDataForMonth(parsedData, newDate.getMonth(), newDate.getFullYear(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature, this.predictor.weatherStationId, this.predictor.weatherStationName);
          //Issue 1822
          // await this.degreeDaysService.setYearHourlyData(newDate.getMonth(), newDate.getFullYear(), this.weatherDataService.selectedStation.ID)
          // let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDetailedDataForMonth(newDate.getMonth(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature)
          let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
            return degreeDay.gapInData == true
          });
          let newPredictorData: IdbPredictorData = getNewIdbPredictorData(this.predictor);
          newPredictorData.date = newDate;
          newPredictorData.amount = getDegreeDayAmount(degreeDays, this.predictor.weatherDataType);
          newPredictorData.weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
          await firstValueFrom(this.predictorDataDbService.addWithObservable(newPredictorData));
          startDate.setMonth(startDate.getMonth() + 1);
        }
      } else {
        this.toastNotificationService.weatherDataErrorToast();
      }
    }
  }

  openStationModal() {
    this.displaySationModal = true;
  }

  cancelStationSelect() {
    this.displaySationModal = false;
  }

  selectStation(station: WeatherStation) {
    this.predictor.weatherStationId = station.ID;
    this.predictor.weatherStationName = station.name;
    this.predictorForm.controls['weatherStationId'].patchValue(station.ID);
    this.cancelStationSelect();
  }
}

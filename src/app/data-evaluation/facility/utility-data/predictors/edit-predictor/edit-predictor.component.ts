import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { DetailDegreeDay } from 'src/app/models/degreeDays';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbPredictor, IdbPredictor } from 'src/app/models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from 'src/app/models/idbModels/predictorData';
// import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { PredictorDataHelperService } from 'src/app/shared/helper-services/predictor-data-helper.service';
import { EditPredictorFormService } from 'src/app/shared/shared-predictors-content/edit-predictor-form.service';
import { getDegreeDayAmount } from 'src/app/shared/sharedHelperFuntions';
import { WeatherDataReading, WeatherDataService } from 'src/app/weather-data/weather-data.service';
import * as _ from 'lodash';
import { getDetailedDataForMonth } from 'src/app/weather-data/weatherDataCalculations';

@Component({
  selector: 'app-edit-predictor',
  templateUrl: './edit-predictor.component.html',
  styleUrl: './edit-predictor.component.css',
  standalone: false
})
export class EditPredictorComponent {

  addOrEdit: 'edit' | 'add';
  predictor: IdbPredictor;
  predictorForm: FormGroup;
  facility: IdbFacility;
  destroyed: boolean = false;
  latestMeterReading: Date;
  firstMeterReading: Date;
  constructor(private activatedRoute: ActivatedRoute,
    private predictorDbService: PredictorDbService,
    private toastNotificationService: ToastNotificationsService,
    private facilityDbService: FacilitydbService,
    private router: Router,
    private editPredictorFormService: EditPredictorFormService,
    private loadingService: LoadingService,
    private predictorDataDbService: PredictorDataDbService,
    // private degreeDaysService: DegreeDaysService,
    private analysisDbService: AnalysisDbService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private predictorDataHelperService: PredictorDataHelperService,
    private weatherDataService: WeatherDataService
  ) {
  }

  ngOnInit() {
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      if (predictorId) {
        this.addOrEdit = 'edit';
        this.setPredictorDataEdit(predictorId);
      } else {
        this.addOrEdit = 'add';
        this.setPredictorDataNew();
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

  setPredictorForm() {
    this.predictorForm = this.editPredictorFormService.getFormFromPredictor(this.predictor);
  }

  cancel() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.facility.id + '/utility/predictors/manage/predictor-table')
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Updating Predictors...');
    this.loadingService.setLoadingStatus(true);
    let needsWeatherDataUpdate: boolean = this.editPredictorFormService.setPredictorDataFromForm(this.predictor, this.predictorForm);
    this.predictorForm.markAsPristine();
    if (this.addOrEdit == 'add') {
      await firstValueFrom(this.predictorDbService.addWithObservable(this.predictor));
    } else {
      await firstValueFrom(this.predictorDbService.updateWithObservable(this.predictor));
    }
    if (this.predictor.predictorType == 'Weather') {
      if (this.addOrEdit == 'edit' && needsWeatherDataUpdate) {
        let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByPredictorId(this.predictor.guid);
        let predictorDates: Array<Date> = predictorData.map(pData => { return new Date(pData.date) })
        let minDate: Date = _.min(predictorDates);
        let maxDate: Date = _.max(predictorDates);
        let parsedData: Array<WeatherDataReading> | 'error' = await this.weatherDataService.getHourlyData(this.predictor.weatherStationId, minDate, maxDate, ['humidity']);
        if (parsedData != 'error') {
          for (let i = 0; i < predictorData.length; i++) {
            if (!predictorData[i].weatherOverride) {
              let entryDate: Date = new Date(predictorData[i].date);
              this.loadingService.setLoadingMessage('Updating Weather Predictors: (' + i + '/' + predictorData.length + ')');
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
          let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
            return degreeDay.gapInData == true
          });
          let newPredictorData: IdbPredictorData = getNewIdbPredictorData(this.predictor);
          newPredictorData.date = newDate;
          newPredictorData.amount = getDegreeDayAmount(degreeDays, this.predictor.weatherDataType);
          newPredictorData.weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
          await firstValueFrom(this.predictorDataDbService.addWithObservable(newPredictorData));
        }
        startDate.setMonth(startDate.getMonth() + 1);
      } else {
        this.toastNotificationService.weatherDataErrorToast();
      }
    }
  }

  canDeactivate(): Observable<boolean> {
    if (this.predictorForm && this.predictorForm.dirty) {
      const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
      return of(result);
    }
    return of(true);
  }
}

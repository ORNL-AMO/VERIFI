import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, from, map, Observable, of, switchAll, take } from 'rxjs';
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
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from 'src/app/models/idbModels/predictorData';
// import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { PredictorDataHelperService } from 'src/app/shared/helper-services/predictor-data-helper.service';
import { EditPredictorFormService } from 'src/app/shared/shared-predictors-content/edit-predictor-form.service';
import { getDegreeDayAmount } from 'src/app/shared/sharedHelperFunctions';
import { checkSameMonthPredictorData } from 'src/app/data-management/data-management-import/import-services/upload-helper-functions';
import { WeatherDataReading, WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { getDetailedDataForMonth } from 'src/app/weather-data/weatherDataCalculations';
import { getDateFromPredictorData } from 'src/app/shared/dateHelperFunctions';
import { Month, Months } from 'src/app/shared/form-data/months';
import { RouterGuardService } from 'src/app/shared/shared-router-guard-modal/router-guard-service';

@Component({
  selector: 'app-facility-predictor',
  templateUrl: './facility-predictor.component.html',
  styleUrl: './facility-predictor.component.css',
  standalone: false,
  host: {
    '(window:keydown)': 'handleKeyDown($event)'
  }
})
export class FacilityPredictorComponent {

  predictor: IdbPredictor;
  predictorForm: FormGroup;
  facility: IdbFacility;
  destroyed: boolean = false;
  latestMeterReading: Date;
  firstMeterReading: Date;

  showDeletePredictor: boolean = false;

  async handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (!this.predictorForm.invalid && !this.predictorForm.pristine) {
        await this.saveChanges();
      }
    }
  }

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
    private weatherDataService: WeatherDataService,
    private routerGuardService: RouterGuardService
  ) {
  }

  ngOnInit() {
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      if (predictorId) {
        this.setPredictor(predictorId);
        this.setPredictorForm();
        this.setLastMeterReading();
      } else {
        //route to manage predictors
      }
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  setPredictor(predictorId: string) {
    let predictor: IdbPredictor = this.predictorDbService.getByGuid(predictorId);
    if (predictor) {
      this.predictor = JSON.parse(JSON.stringify(predictor));
      this.setPredictorForm();
    } else {
      this.toastNotificationService.showToast('Predictor Not Found', undefined, 2000, false, 'alert-danger');
      this.goToManagePredictors();
    }
  }

  setPredictorForm() {
    this.predictorForm = this.editPredictorFormService.getFormFromPredictor(this.predictor);
  }

  goToManagePredictors() {
    this.router.navigateByUrl('data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/predictors')
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Updating Predictors...');
    this.loadingService.setLoadingStatus(true);
    let needsWeatherDataUpdate: boolean = this.editPredictorFormService.setPredictorDataFromForm(this.predictor, this.predictorForm);
    this.predictorForm.markAsPristine();
    await firstValueFrom(this.predictorDbService.updateWithObservable(this.predictor));
    if (this.predictor.predictorType == 'Weather') {
      if (needsWeatherDataUpdate) {
        await this.updateWeatherData();
      }
    }

    await this.analysisDbService.updateAnalysisPredictor(this.predictor);
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setPredictorsV2(account, this.facility);
    await this.dbChangesService.setPredictorDataV2(account, true, this.facility);
    await this.dbChangesService.setAnalysisItems(account, true, this.facility);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Predictor Entries Updated!', undefined, undefined, false, 'alert-success');
  }

  setLastMeterReading() {
    this.latestMeterReading = this.predictorDataHelperService.getLastMeterDate(this.facility);
    this.firstMeterReading = this.predictorDataHelperService.getFirstMeterDate(this.facility);
  }

  async updateWeatherData() {
    let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByPredictorId(this.predictor.guid);
    if (this.latestMeterReading && this.firstMeterReading) {
      let startDate: Date = new Date(this.firstMeterReading);
      let endDate: Date = new Date(this.latestMeterReading);
      let parsedData: Array<WeatherDataReading> | 'error' = await this.weatherDataService.getHourlyData(this.predictor.weatherStationId, startDate, endDate, []);
      if (parsedData != 'error') {
        while (startDate <= endDate) {
          if (this.destroyed) {
            break;
          }
          let newDate: Date = new Date(startDate);
          let month: Month = Months.find(m => m.monthNumValue == newDate.getMonth());
          let dateString = month.abbreviation + ', ' + newDate.getFullYear();
          this.loadingService.setLoadingMessage('Adding Weather Predictors: ' + dateString);
          let degreeDays: Array<DetailDegreeDay> = getDetailedDataForMonth(parsedData, newDate.getMonth(), newDate.getFullYear(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature, this.predictor.weatherStationId, this.predictor.weatherStationName);
          let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
            return degreeDay.gapInData == true
          });
          let predictorExists: IdbPredictorData = predictorData.find(pData => { return checkSameMonthPredictorData(pData, newDate) });
          if (!predictorExists) {
            let newPredictorData: IdbPredictorData = getNewIdbPredictorData(this.predictor);
            newPredictorData.month = newDate.getMonth() + 1;
            newPredictorData.year = newDate.getFullYear();
            newPredictorData.amount = getDegreeDayAmount(degreeDays, this.predictor.weatherDataType);
            newPredictorData.weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
            await firstValueFrom(this.predictorDataDbService.addWithObservable(newPredictorData));
          } else {
            predictorExists.month = newDate.getMonth() + 1;
            predictorExists.year = newDate.getFullYear();
            predictorExists.amount = getDegreeDayAmount(degreeDays, this.predictor.weatherDataType);
            predictorExists.weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
            await firstValueFrom(this.predictorDataDbService.updateWithObservable(predictorExists));
          }
          startDate.setMonth(startDate.getMonth() + 1);
        }
      } else {
        this.toastNotificationService.weatherDataErrorToast();
      }
      //remove data outside of start/end date for meters
      let startDateFilter: Date = new Date(this.firstMeterReading);
      let endDateFilter: Date = new Date(this.latestMeterReading);
      let filterData: Array<IdbPredictorData> = predictorData.filter(pData => {
        let pDataDate: Date = getDateFromPredictorData(pData);
        return (pDataDate.getTime() < startDateFilter.getTime() || pDataDate.getTime() > endDateFilter.getTime());
      });
      for (let i = 0; i < filterData.length; i++) {
        await firstValueFrom(this.predictorDataDbService.deleteIndexWithObservable(filterData[i].id))
      }
    }
  }

  canDeactivate(): Observable<boolean> {
    if (this.predictorForm && this.predictorForm.dirty) {
      this.routerGuardService.setShowSave(true);
      this.routerGuardService.setShowModal(true);
      return this.routerGuardService.getModalAction().pipe(map(action => {
        if (action == 'save') {
          return from(this.saveChanges()).pipe(map(() => true));
        } else if (action == 'discard') {
          return of(true);
        }
        return of(false);
      }),
        take(1), switchAll());
    }
    return of(true);
  }

  showDelete() {
    this.showDeletePredictor = true;
  }

  cancelDelete() {
    this.showDeletePredictor = false;
  }

  async confirmDelete() {
    this.showDeletePredictor = false;
    this.loadingService.setLoadingMessage('Deleting Predictor Data...');
    this.loadingService.setLoadingStatus(true);
    //delete predictor
    await firstValueFrom(this.predictorDbService.deleteWithObservable(this.predictor.id));
    //delete predictor data
    let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByPredictorId(this.predictor.guid);
    await this.predictorDataDbService.deletePredictorDataAsync(predictorData);
    //set values in services
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setPredictorsV2(account, this.facility);
    await this.dbChangesService.setPredictorDataV2(account, true, this.facility);
    //update analysis items
    this.loadingService.setLoadingMessage('Updating analysis items...');
    await this.analysisDbService.deleteAnalysisPredictor(this.predictor);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Predictor Deleted', undefined, 1000, false, 'alert-success');
    this.goToManagePredictors();
  }

}

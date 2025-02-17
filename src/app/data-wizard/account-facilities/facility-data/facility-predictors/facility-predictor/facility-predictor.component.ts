import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
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
import { getNewIdbPredictor, IdbPredictor } from 'src/app/models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { PredictorDataHelperService } from 'src/app/shared/helper-services/predictor-data-helper.service';
import { EditPredictorFormService } from 'src/app/shared/shared-predictors-content/edit-predictor-form.service';
import { getDegreeDayAmount } from 'src/app/shared/sharedHelperFuntions';
import { checkSameMonth } from 'src/app/upload-data/upload-helper-functions';

@Component({
  selector: 'app-facility-predictor',
  templateUrl: './facility-predictor.component.html',
  styleUrl: './facility-predictor.component.css',
  standalone: false
})
export class FacilityPredictorComponent {

  predictor: IdbPredictor;
  predictorForm: FormGroup;
  facility: IdbFacility;
  destroyed: boolean = false;
  latestMeterReading: Date;
  firstMeterReading: Date;

  showDeletePredictor: boolean = false;
  constructor(private activatedRoute: ActivatedRoute,
    private predictorDbService: PredictorDbService,
    private toastNotificationService: ToastNotificationsService,
    private facilityDbService: FacilitydbService,
    private router: Router,
    private editPredictorFormService: EditPredictorFormService,
    private loadingService: LoadingService,
    private predictorDataDbService: PredictorDataDbService,
    private degreeDaysService: DegreeDaysService,
    private analysisDbService: AnalysisDbService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private predictorDataHelperService: PredictorDataHelperService,
    private accountAnalysisDbService: AccountAnalysisDbService
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
    this.router.navigateByUrl('data-wizard/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/predictors')
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
    await this.dbChangesService.setPredictorDataV2(account, this.facility);
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
      let datePipe: DatePipe = new DatePipe(navigator.language);
      let stringFormat: string = 'MMM, yyyy';
      let startDate: Date = new Date(this.firstMeterReading);
      let endDate: Date = new Date(this.latestMeterReading);
      while (startDate <= endDate) {
        if (this.destroyed) {
          break;
        }
        let newDate: Date = new Date(startDate);
        let dateString = datePipe.transform(newDate, stringFormat);
        this.loadingService.setLoadingMessage('Adding Weather Predictors: ' + dateString);
        let degreeDays: 'error' | Array<DetailDegreeDay> = await this.degreeDaysService.getDailyDataFromMonth(newDate.getMonth(), newDate.getFullYear(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature, this.predictor.weatherStationId);
        if (degreeDays != 'error') {
          let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
            return degreeDay.gapInData == true
          });
          let predictorExists: IdbPredictorData = predictorData.find(p => { return checkSameMonth(new Date(p.date), newDate) });
          if (!predictorExists) {
            let newPredictorData: IdbPredictorData = getNewIdbPredictorData(this.predictor);
            newPredictorData.date = newDate;
            newPredictorData.amount = getDegreeDayAmount(degreeDays, this.predictor.weatherDataType);
            newPredictorData.weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
            await firstValueFrom(this.predictorDataDbService.addWithObservable(newPredictorData));
          } else {
            predictorExists.date = newDate;
            predictorExists.amount = getDegreeDayAmount(degreeDays, this.predictor.weatherDataType);
            predictorExists.weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
            await firstValueFrom(this.predictorDataDbService.updateWithObservable(predictorExists));
          }
        } else {
          this.toastNotificationService.weatherDataErrorToast();
        }
        startDate.setMonth(startDate.getMonth() + 1);
      }
      //remove data outside of start/end date for meters
      let startDateFilter: Date = new Date(this.firstMeterReading);
      let endDateFilter: Date = new Date(this.latestMeterReading);
      let filterData: Array<IdbPredictorData> = predictorData.filter(pData => {
        let pDataDate: Date = new Date(pData.date);
        return (pDataDate < startDateFilter || pDataDate > endDateFilter);
      });
      for (let i = 0; i < filterData.length; i++) {
        await firstValueFrom(this.predictorDataDbService.deleteIndexWithObservable(filterData[i].id))
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

  showDelete() {
    this.showDeletePredictor = true;
  }

  cancelDelete() {
    this.showDeletePredictor = false;
  }

  async confirmDelete() {
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
    await this.dbChangesService.setPredictorDataV2(account, this.facility);
    //update analysis items
    this.loadingService.setLoadingMessage('Updating analysis items...');
    await this.analysisDbService.deleteAnalysisPredictor(this.predictor);
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    await this.accountAnalysisDbService.updateAccountValidation(accountAnalysisItems);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Predictor Deleted', undefined, 1000, false, 'alert-success');
    this.goToManagePredictors();
  }

}

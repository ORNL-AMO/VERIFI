import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Observable, of, Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { DetailDegreeDay } from 'src/app/models/degreeDays';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';
import * as _ from 'lodash';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getDegreeDayAmount, getWeatherSearchFromFacility } from 'src/app/shared/sharedHelperFuntions';
// import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';

@Component({
  selector: 'app-predictors-data-form',
  templateUrl: './predictors-data-form.component.html',
  styleUrl: './predictors-data-form.component.css',
  standalone: false
})
export class PredictorsDataFormComponent {

  addOrEdit: 'add' | 'edit';
  predictor: IdbPredictor;
  predictorData: IdbPredictorData;
  calculatingDegreeDays: boolean;
  isSaved: boolean = true;
  paramsSub: Subscription;
  constructor(private activatedRoute: ActivatedRoute, private predictorDbService: PredictorDbService,
    private router: Router, private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService, private dbChangesService: DbChangesService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private weatherDataService: WeatherDataService,
    private predictorDataDbService: PredictorDataDbService
    // private degreeDaysService: DegreeDaysService
  ) {
  }

  ngOnInit() {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(params => {
      let predictorId: string = params['id'];
      this.predictor = this.predictorDbService.getByGuid(predictorId);
    });

    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      if (predictorId) {
        this.addOrEdit = 'edit';
        this.setPredictorEntryEdit(predictorId);
      } else {
        this.addOrEdit = 'add';
        this.setNewPredictorEntry();
      }
      this.setDegreeDayValues();
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  cancel() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/predictors/predictor/' + this.predictor.guid)
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Savings Predictor Entry...');
    this.loadingService.setLoadingStatus(true);
    if (this.addOrEdit == "edit") {
      await firstValueFrom(this.predictorDataDbService.updateWithObservable(this.predictorData));
    } else {
      await firstValueFrom(this.predictorDataDbService.addWithObservable(this.predictorData));
    }
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setPredictorDataV2(selectedAccount, selectedFacility);
    this.isSaved = true;
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Predictors Updated!', undefined, undefined, false, 'alert-success');
  }

  setPredictorEntryEdit(predictorId: string) {
    let predictorData: IdbPredictorData = this.predictorDataDbService.getByGuid(predictorId);
    this.predictorData = JSON.parse(JSON.stringify(predictorData));
  }

  setNewPredictorEntry() {
    let predictorDataEntries: Array<IdbPredictorData> = this.predictorDataDbService.getByPredictorId(this.predictor.guid);
    this.predictorData = getNewIdbPredictorData(this.predictor, predictorDataEntries);
  }

  setDate(eventData: string) {
    //eventData format = yyyy-mm = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.predictorData.date = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, 1);
    this.isSaved = false;
    this.setDegreeDayValues();
  }

  async setDegreeDayValues() {
    if (this.predictor.predictorType == 'Weather') {
      this.calculatingDegreeDays = true;
      let hasWeatherDataWarning: boolean = false;
      if (!this.predictorData.weatherOverride) {
        let entryDate: Date = new Date(this.predictorData.date);
        //ISSUE 1822
        // await this.degreeDaysService.setYearHourlyData(entryDate.getMonth(), entryDate.getFullYear(), this.predictor.weatherStationId,)
        // let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDetailedDataForMonth(entryDate.getMonth(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature)
        let degreeDays: Array<DetailDegreeDay> | 'error' = await this.weatherDataService.getDegreeDaysForMonth(entryDate, this.predictor.weatherStationId, this.predictor.weatherStationName, this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature);
        if (degreeDays != 'error') {
          let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
            return degreeDay.gapInData == true
          });
          if (!hasWeatherDataWarning && hasErrors != undefined || degreeDays.length == 0) {
            hasWeatherDataWarning = true;
          }
          this.predictorData.amount = getDegreeDayAmount(degreeDays, this.predictor.weatherDataType);
          this.predictorData.weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
        } else {
          this.toastNotificationService.weatherDataErrorToast();
        }
      }
    }
    this.calculatingDegreeDays = false;
  }

  goToWeatherData() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.weatherDataService.selectedFacility = facility;
    this.weatherDataService.addressSearchStr = getWeatherSearchFromFacility(facility);
    this.weatherDataService.selectedMonth = this.predictorData.date;
    this.weatherDataService.selectedYear = new Date(this.predictorData.date).getFullYear();
    this.router.navigateByUrl('/weather-data');
  }

  setChanged() {
    this.isSaved = false;
  }

  canDeactivate(): Observable<boolean> {
    if (!this.isSaved) {
      const result = window.confirm('There are unsaved changes! Are you sure you want to leave this page?');
      return of(result);
    }
    return of(true);
  }

  setWeatherManually() {
    if (this.predictor.predictorType == 'Weather') {
      this.predictorData.weatherOverride = true;
      this.predictorData.weatherDataWarning = false;
    }
  }

  async revertManualWeatherData() {
    if (this.predictor.predictorType == 'Weather') {
      this.predictorData.weatherOverride = false;
    }
    await this.setDegreeDayValues();
  }

  async saveAndQuit() {
    await this.saveChanges();
    this.cancel();
  }

  async saveAndAddAnother() {
    await this.saveChanges();
    this.setNewPredictorEntry();
    this.setDegreeDayValues();
    this.isSaved = false;
  }
}

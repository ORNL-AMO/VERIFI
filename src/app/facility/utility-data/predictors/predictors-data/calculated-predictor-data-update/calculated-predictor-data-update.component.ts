import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { DetailDegreeDay } from 'src/app/models/degreeDays';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';
import * as _ from 'lodash';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-calculated-predictor-data-update',
  templateUrl: './calculated-predictor-data-update.component.html',
  styleUrl: './calculated-predictor-data-update.component.css'
})
export class CalculatedPredictorDataUpdateComponent {

  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  predictorDataSub: Subscription;
  // predictorData: Array<IdbPredictorData> = [];

  predictor: IdbPredictor;
  predictorData: Array<CalculatedPredictorTableItem>;
  orderDataField: string = 'changeAmount';
  orderByDirection: string = 'desc';
  currentPageNumber: number = 1;
  calculatingData: boolean = false;
  destroyed: boolean = false;
  paramsSub: Subscription;
  constructor(private activatedRoute: ActivatedRoute, private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private sharedDataService: SharedDataService,
    private router: Router,
    private facilityDbService: FacilitydbService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private degreeDaysService: DegreeDaysService,
    private weatherDataService: WeatherDataService
  ) {

  }

  ngOnInit() {
    this.predictorDataSub = this.predictorDataDbService.facilityPredictorData.subscribe(() => {
      this.setPredictorData();
    });

    this.paramsSub = this.activatedRoute.parent.params.subscribe(params => {
      let predictorId: string = params['id'];
      this.predictor = this.predictorDbService.getByGuid(predictorId);
      this.setPredictorData();
    });


    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.itemsPerPageSub.unsubscribe();
    this.predictorDataSub.unsubscribe();
    this.paramsSub.unsubscribe();
    this.destroyed = true;
  }

  setPredictorData() {
    if (this.predictor) {
      let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByPredictorId(this.predictor.guid);
      this.predictorData = predictorData.map(pData => {
        return {
          ...pData,
          updatedAmount: undefined,
          changeAmount: undefined
        }
      });
      this.setUpdatedAmount();
    }
  }

  async setUpdatedAmount() {
    this.calculatingData = true;
    for (let i = 0; i < this.predictorData.length; i++) {
      if (this.destroyed) {
        console.log('destroyed.')
        // i = this.predictorData.length;
        break;
      }
      console.log('calculating...')
      let stationId: string = this.predictor.weatherStationId;
      let entryDate: Date = new Date(this.predictorData[i].date);
      let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDailyDataFromMonth(entryDate.getMonth(), entryDate.getFullYear(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature, stationId);
      let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
        return degreeDay.gapInData == true
      });
      if (this.predictor.weatherDataType == 'CDD') {
        let totalCDD: number = _.sumBy(degreeDays, 'coolingDegreeDay');
        this.predictorData[i].updatedAmount = totalCDD;
        this.predictorData[i].changeAmount = (this.predictorData[i].amount - this.predictorData[i].updatedAmount)
        this.predictorData[i].weatherDataWarning = hasErrors != undefined;
      } else {
        let totalHDD: number = _.sumBy(degreeDays, 'heatingDegreeDay');
        this.predictorData[i].updatedAmount = totalHDD;
        this.predictorData[i].changeAmount = (this.predictorData[i].amount - this.predictorData[i].updatedAmount)
        this.predictorData[i].weatherDataWarning = hasErrors != undefined;
      }
    }
    this.calculatingData = false;
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }

  cancel() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/predictors/predictor/' + this.predictor.guid)
  }

  async updateEntries() {
    this.loadingService.setLoadingMessage('Updating Entries...');
    this.loadingService.setLoadingStatus(true);
    for (let i = 0; i < this.predictorData.length; i++) {
      let pData: CalculatedPredictorTableItem = this.predictorData[i];
      if (pData.changeAmount) {
        delete pData.changeAmount;
        delete pData.updatedAmount;
        await firstValueFrom(this.predictorDataDbService.updateWithObservable(pData));
      }
    }
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Predictors Updated!', undefined, undefined, false, 'alert-success');
    this.cancel();
  }
}

export interface CalculatedPredictorTableItem extends IdbPredictorData {
  updatedAmount: number,
  changeAmount: number
}
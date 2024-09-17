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
import { getNewIdbPredictorData, IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import * as _ from 'lodash';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
  selector: 'app-calculated-predictor-data-update',
  templateUrl: './calculated-predictor-data-update.component.html',
  styleUrl: './calculated-predictor-data-update.component.css'
})
export class CalculatedPredictorDataUpdateComponent {

  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  predictorDataSub: Subscription;

  predictor: IdbPredictor;
  predictorData: Array<CalculatedPredictorTableItem>;
  orderDataField: string = 'date';
  orderByDirection: string = 'desc';
  currentPageNumber: number = 1;
  calculatingData: boolean = false;
  destroyed: boolean = false;
  paramsSub: Subscription;

  startDate: Date;
  endDate: Date;

  dataSummary: {
    newEntries: number,
    deletedEntries: number,
    changedEntries: number
  } = {
      newEntries: 0,
      deletedEntries: 0,
      changedEntries: 0
    };
  calculationDate: Date;
  constructor(private activatedRoute: ActivatedRoute, private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private sharedDataService: SharedDataService,
    private router: Router,
    private facilityDbService: FacilitydbService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private degreeDaysService: DegreeDaysService
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
          changeAmount: undefined,
          deleted: false,
          added: false
        }
      });
      this.setUpdatedAmount();
      this.predictorData = _.orderBy(this.predictorData, (pData: CalculatedPredictorTableItem) => {
        return new Date(pData.date)
      });
      if (this.predictorData.length > 0) {
        this.startDate = new Date(this.predictorData[0].date);
        this.endDate = new Date(this.predictorData[this.predictorData.length - 1].date);
      }
    }
  }

  async setUpdatedAmount() {
    this.calculatingData = true;
    for (let i = 0; i < this.predictorData.length; i++) {
      if (this.destroyed) {
        break;
      }
      if (!this.predictorData[i].weatherOverride && !this.predictorData[i].updatedAmount) {
        let stationId: string = this.predictor.weatherStationId;
        let entryDate: Date = new Date(this.predictorData[i].date);
        let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDailyDataFromMonth(entryDate.getMonth(), entryDate.getFullYear(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature, stationId);
        let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
          return degreeDay.gapInData == true
        });
        if (this.predictor.weatherDataType == 'CDD') {
          let totalCDD: number = _.sumBy(degreeDays, 'coolingDegreeDay');
          this.predictorData[i].updatedAmount = totalCDD;
          this.predictorData[i].changeAmount = Math.abs(this.predictorData[i].amount - this.predictorData[i].updatedAmount)
          this.predictorData[i].weatherDataWarning = hasErrors != undefined;
        } else {
          let totalHDD: number = _.sumBy(degreeDays, 'heatingDegreeDay');
          this.predictorData[i].updatedAmount = totalHDD;
          this.predictorData[i].changeAmount = Math.abs(this.predictorData[i].amount - this.predictorData[i].updatedAmount)
          this.predictorData[i].weatherDataWarning = hasErrors != undefined;
        }
      }
    }
    this.setDataSummary();
    this.calculatingData = false;
  }


  async updateDataDateChange() {
    if (this.endDate && this.startDate) {
      let endDate: Date = new Date(this.endDate);
      let startDate: Date = new Date(this.startDate);
      let orderedData: Array<CalculatedPredictorTableItem> = _.orderBy(this.predictorData, (pData: CalculatedPredictorTableItem) => {
        return new Date(pData.date)
      });

      if (orderedData.length > 0) {
        let dataEndDate: Date = new Date(orderedData[orderedData.length - 1].date);
        dataEndDate.setMonth(dataEndDate.getMonth() + 1);
        if (dataEndDate < endDate) {
          await this.addDegreeDays(startDate, endDate);
        }
        let dataStartDate: Date = new Date(orderedData[0].date);
        if (startDate < dataStartDate) {
          await this.addDegreeDays(startDate, dataStartDate);
        }

        let testStartDate: Date = new Date(this.startDate);
        let testEndDate: Date = new Date(this.endDate);
        if (dataEndDate > testEndDate || dataStartDate > testStartDate) {
          this.predictorData = this.predictorData.filter(pData => {
            return pData.id || ((pData.date <= testEndDate) && (pData.date >= testStartDate));
          });
          this.predictorData = this.predictorData.map(pData => {
            if (pData.date > testEndDate || pData.date < testStartDate) {
              pData.deleted = true
            } else {
              pData.deleted = false;
            }
            return pData;
          });
        }
      } else {
        let dataEndDate: Date = new Date(endDate);
        dataEndDate.setMonth(dataEndDate.getMonth() + 1);
        await this.addDegreeDays(startDate, dataEndDate);
      }



      this.setDataSummary();
    }
    this.calculatingData = false;
  }

  async addDegreeDays(startDate: Date, endDate: Date) {
    while (startDate < endDate) {
      if (this.destroyed) {
        break;
      }
      this.calculatingData = true;
      let newDate: Date = new Date(startDate)
      this.calculationDate = new Date(newDate);
      let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDailyDataFromMonth(newDate.getMonth(), newDate.getFullYear(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature, this.predictor.weatherStationId);
      let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
        return degreeDay.gapInData == true
      });
      let newPredictorData: IdbPredictorData = getNewIdbPredictorData(this.predictor);
      newPredictorData.date = newDate;
      if (this.predictor.weatherDataType == 'CDD') {
        let totalCDD: number = _.sumBy(degreeDays, 'coolingDegreeDay');
        newPredictorData.amount = totalCDD;
        newPredictorData.weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
      } else {
        let totalHDD: number = _.sumBy(degreeDays, 'heatingDegreeDay');
        newPredictorData.amount = totalHDD;
        newPredictorData.weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
      }
      let tableItem: CalculatedPredictorTableItem = {
        ...newPredictorData,
        updatedAmount: newPredictorData.amount,
        changeAmount: 0,
        deleted: false,
        added: true
      };
      this.predictorData.push(tableItem);
      startDate.setMonth(startDate.getMonth() + 1);
    }
  }

  setDataSummary() {
    this.dataSummary = {
      changedEntries: 0,
      deletedEntries: 0,
      newEntries: 0
    }
    this.predictorData.forEach(pData => {
      if (pData.added) {
        this.dataSummary.newEntries++;
      } else if (pData.deleted) {
        this.dataSummary.deletedEntries++;
      } else if (pData.changeAmount != 0) {
        this.dataSummary.changedEntries++
      }
    })
  };


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
      if (pData.changeAmount && !pData.added && !pData.deleted) {
        delete pData.changeAmount;
        delete pData.updatedAmount;
        await firstValueFrom(this.predictorDataDbService.updateWithObservable(pData));
      } else if (pData.added) {
        delete pData.changeAmount;
        delete pData.updatedAmount;
        delete pData.added;
        delete pData.deleted;
        await firstValueFrom(this.predictorDataDbService.addWithObservable(pData));
      } else if (pData.deleted) {
        await firstValueFrom(this.predictorDataDbService.deleteIndexWithObservable(pData.id));
      }
    }
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setPredictorDataV2(account, selectedFacility)
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Predictors Updated!', undefined, undefined, false, 'alert-success');
    this.cancel();
  }

  async setEndDate(eventData: string) {
    //eventData format = yyyy-mm = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.endDate = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, 1);
    await this.updateDataDateChange();
  }

  async setStartDate(eventData: string) {
    //eventData format = yyyy-mm = 2022-06
    let yearMonth: Array<string> = eventData.split('-');
    //-1 on month
    this.startDate = new Date(Number(yearMonth[0]), Number(yearMonth[1]) - 1, 1);
    await this.updateDataDateChange();
  }
}

export interface CalculatedPredictorTableItem extends IdbPredictorData {
  updatedAmount: number,
  changeAmount: number,
  deleted: boolean,
  added: boolean
}
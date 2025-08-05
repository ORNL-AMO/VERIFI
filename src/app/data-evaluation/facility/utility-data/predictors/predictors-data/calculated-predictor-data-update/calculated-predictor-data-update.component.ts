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
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import * as _ from 'lodash';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { getDegreeDayAmount } from 'src/app/shared/sharedHelperFuntions';
import { PredictorDataHelperService } from 'src/app/shared/helper-services/predictor-data-helper.service';
import { WeatherDataReading, WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { getDetailedDataForMonth } from 'src/app/weather-data/weatherDataCalculations';
// import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';

@Component({
    selector: 'app-calculated-predictor-data-update',
    templateUrl: './calculated-predictor-data-update.component.html',
    styleUrl: './calculated-predictor-data-update.component.css',
    standalone: false
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
  latestMeterReading: Date;
  firstMeterReading: Date;

  displayUpdatesModal: boolean = false;
  checkForUpdates: boolean = false;
  constructor(private activatedRoute: ActivatedRoute, private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private sharedDataService: SharedDataService,
    private router: Router,
    private facilityDbService: FacilitydbService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private predictorDataHelperService: PredictorDataHelperService,
    private weatherDataService: WeatherDataService
    // private degreeDaysService: DegreeDaysService
  ) {

  }

  ngOnInit() {
    this.setLastMeterReading();
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

  setLastMeterReading() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.latestMeterReading = this.predictorDataHelperService.getLastMeterDate(facility);
    this.firstMeterReading = this.predictorDataHelperService.getFirstMeterDate(facility);
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
      this.predictorData = _.orderBy(this.predictorData, (pData: CalculatedPredictorTableItem) => {
        return new Date(pData.date)
      });
      if (this.predictorData.length > 0) {
        this.startDate = new Date(this.predictorData[0].date);
        this.endDate = new Date(this.predictorData[this.predictorData.length - 1].date);
        if (this.endDate < this.latestMeterReading) {
          this.endDate = new Date(this.latestMeterReading);
          this.updateDataDateChange();
        }
      }
    }
  }

  async setUpdatedAmount(updateAll: boolean) {
    this.checkForUpdates = true;
    this.closeCheckForUpdatesModal();
    this.calculatingData = true;
    let predictorStart: number = 0;

    let existingPredictorIndex: Array<number> = this.predictorData.map((p, idx) => {
      if (p.id && p.updatedAmount == undefined) {
        return idx
      };
      return undefined;
    });
    existingPredictorIndex = existingPredictorIndex.filter(idx => {
      return idx != undefined;
    });
    if (existingPredictorIndex.length > 6 && !updateAll) {
      predictorStart = (existingPredictorIndex.length - 6);
    }
    for (let i = predictorStart; i < existingPredictorIndex.length; i++) {
      if (this.destroyed) {
        break;
      }
      let predictorIndex: number = existingPredictorIndex[i];
      if (!this.predictorData[predictorIndex].weatherOverride && !this.predictorData[predictorIndex].updatedAmount) {
        let entryDate: Date = new Date(this.predictorData[predictorIndex].date);
        let degreeDays: Array<DetailDegreeDay> | 'error' = await this.weatherDataService.getDegreeDaysForMonth(entryDate, this.predictor.weatherStationId, this.predictor.weatherStationName, this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature);
        //ISSUE 1822
        // await this.degreeDaysService.setYearHourlyData(entryDate.getMonth(), entryDate.getFullYear(), this.predictor.weatherStationId,)
        // let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDetailedDataForMonth(entryDate.getMonth(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature)
        if (degreeDays != 'error') {
          let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
            return degreeDay.gapInData == true
          });
          this.predictorData[predictorIndex].updatedAmount = getDegreeDayAmount(degreeDays, this.predictor.weatherDataType);
          this.predictorData[predictorIndex].changeAmount = Math.abs(this.predictorData[predictorIndex].amount - this.predictorData[predictorIndex].updatedAmount)
          this.predictorData[predictorIndex].weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
        } else {
          this.toastNotificationService.weatherDataErrorToast();
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
        if (dataEndDate <= endDate) {
          await this.addDegreeDays(dataEndDate, endDate);
        }
        let dataStartDate: Date = new Date(orderedData[0].date);
        dataStartDate.setMonth(dataStartDate.getMonth() - 1);
        if (startDate <= dataStartDate) {
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
        // dataEndDate.setMonth(dataEndDate.getMonth() + 1);
        await this.addDegreeDays(startDate, dataEndDate);
      }



      this.setDataSummary();
    }
    this.calculatingData = false;
  }

  async addDegreeDays(startDate: Date, endDate: Date) {
    let parsedData: Array<WeatherDataReading> | 'error' = await this.weatherDataService.getHourlyData(this.predictor.weatherStationId, startDate, endDate, ['humidity']);
    if (parsedData != 'error') {
      while (startDate <= endDate) {
        if (this.destroyed) {
          break;
        }
        this.calculatingData = true;
        let newDate: Date = new Date(startDate);
        this.calculationDate = new Date(newDate);
        //ISSUE 1822
        let degreeDays: Array<DetailDegreeDay> = getDetailedDataForMonth(parsedData, newDate.getMonth(), newDate.getFullYear(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature, this.predictor.weatherStationId, this.predictor.weatherStationName);
        // await this.degreeDaysService.setYearHourlyData(newDate.getMonth(), newDate.getFullYear(), this.predictor.weatherStationId,)
        // let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDetailedDataForMonth(newDate.getMonth(), this.predictor.heatingBaseTemperature, this.predictor.coolingBaseTemperature)
        let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
          return degreeDay.gapInData == true
        });
        let newPredictorData: IdbPredictorData = getNewIdbPredictorData(this.predictor);
        newPredictorData.date = newDate;
        newPredictorData.amount = getDegreeDayAmount(degreeDays, this.predictor.weatherDataType);
        newPredictorData.weatherDataWarning = hasErrors != undefined || degreeDays.length == 0;
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
    }else{
      this.toastNotificationService.weatherDataErrorToast();
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
      } else if (pData.changeAmount != 0 && pData.changeAmount != undefined) {
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
    this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid + '/utility/predictors/predictor/' + this.predictor.guid)
  }

  async updateEntries() {
    this.loadingService.setLoadingMessage('Updating Entries...');
    this.loadingService.setLoadingStatus(true);
    for (let i = 0; i < this.predictorData.length; i++) {
      let pData: CalculatedPredictorTableItem = this.predictorData[i];
      if (pData.changeAmount && !pData.added && !pData.deleted) {
        pData.amount = pData.updatedAmount;
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

  openCheckForUpdatesModal() {
    this.displayUpdatesModal = true;
  }

  closeCheckForUpdatesModal() {
    this.displayUpdatesModal = false;
  }
}

export interface CalculatedPredictorTableItem extends IdbPredictorData {
  updatedAmount: number,
  changeAmount: number,
  deleted: boolean,
  added: boolean
}
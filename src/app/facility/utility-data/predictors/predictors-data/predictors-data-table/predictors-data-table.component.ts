import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import * as _ from 'lodash';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

@Component({
  selector: 'app-predictors-data-table',
  templateUrl: './predictors-data-table.component.html',
  styleUrl: './predictors-data-table.component.css'
})
export class PredictorsDataTableComponent {
  @ViewChild('predictorTable', { static: false }) predictorTable: ElementRef;
  copyingTable: boolean = false;

  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  currentPageNumber: number = 1;
  allChecked: boolean = false;
  hasCheckedItems: boolean = false;
  showBulkDelete: boolean = false;
  orderDataField: string = 'date';
  orderByDirection: string = 'desc';

  predictorDataSub: Subscription;
  predictorData: Array<IdbPredictorData> = [];

  predictorDataToDelete: IdbPredictorData;
  hasWeatherData: boolean;
  hasWeatherDataWarnings: boolean = false;
  predictor: IdbPredictor;
  constructor(private activatedRoute: ActivatedRoute, private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private sharedDataService: SharedDataService,
    private router: Router,
    private copyTableService: CopyTableService,
    private facilityDbService: FacilitydbService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService
  ) {

  }

  ngOnInit() {
    this.predictorDataSub = this.predictorDataDbService.facilityPredictorData.subscribe(() => {
      this.setPredictorData();
    });

    this.activatedRoute.parent.params.subscribe(params => {
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
  }

  setPredictorData(){
    if(this.predictor){
      this.predictorData = this.predictorDataDbService.getByPredictorId(this.predictor.guid);
    }
  }

  addPredictorEntry() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/predictors/predictor/' + this.predictor.guid + '/add-entry');
  }

  setDeletePredictorData(predictorEntry: IdbPredictorData) {
    this.predictorDataToDelete = predictorEntry;
  }

  async confirmDeletePredictorData() {
    this.loadingService.setLoadingMessage('Deleting Predictor Entry...');
    this.loadingService.setLoadingStatus(true);
    await firstValueFrom(this.predictorDataDbService.deleteIndexWithObservable(this.predictorDataToDelete.id));
    this.cancelDeletePredictorData();
    await this.finishDelete();
  }

  cancelDeletePredictorData() {
    this.predictorDataToDelete = undefined;
  }

  setEditPredictorData(predictorEntry: IdbPredictorData) {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/predictors/predictor/' + this.predictor.guid + 'edit-entry/' + predictorEntry.guid);
  }

  uploadData() {
    this.router.navigateByUrl('/upload');
  }

  checkAll() {
    let orderedItems: Array<IdbPredictorData> = this.getOrderedData();
    let displayedItems: Array<IdbPredictorData> = orderedItems.slice(((this.currentPageNumber - 1) * this.itemsPerPage), (this.currentPageNumber * this.itemsPerPage))
    displayedItems.forEach(item => {
      item.checked = this.allChecked;
    });
    this.hasCheckedItems = (this.allChecked == true);
  }

  getOrderedData(): Array<IdbPredictorData> {
    if (this.orderDataField == 'date') {
      return _.orderBy(this.predictorData, this.orderDataField, this.orderByDirection)
    } else {
      return _.orderBy(this.predictorData, (data: IdbPredictorData) => {
        return data.amount;
      }, this.orderByDirection);
    }
  }

  setHasChecked() {
    let hasChecked: boolean = false;
    let predictorEntries: Array<IdbPredictorData> = this.getOrderedData();
    let displayedItems: Array<IdbPredictorData> = predictorEntries.slice(((this.currentPageNumber - 1) * this.itemsPerPage), (this.currentPageNumber * this.itemsPerPage))
    displayedItems.forEach(item => {
      if (item.checked) {
        hasChecked = true;
      }
    });
    this.hasCheckedItems = hasChecked;
  }

  openBulkDelete() {
    this.showBulkDelete = true;
  }

  cancelBulkDelete() {
    this.showBulkDelete = false;
  }

  async bulkDelete() {
    this.loadingService.setLoadingMessage("Deleting Predictor Entries...");
    this.loadingService.setLoadingStatus(true);
    let checkedItems: Array<IdbPredictorData> = new Array();
    this.predictorData.forEach(entry => {
      if (entry.checked == true) {
        checkedItems.push(entry);
      }
    })
    for (let index = 0; index < checkedItems.length; index++) {
      await firstValueFrom(this.predictorDataDbService.deleteIndexWithObservable(checkedItems[index].id));
    }

    this.allChecked = false;
    this.cancelBulkDelete();
    await this.finishDelete();
  }

  async finishDelete() {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setPredictorDataV2(account, selectedFacility);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast("Predictor Data Deleted!", undefined, undefined, false, "alert-success");
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


  copyTable() {
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.predictorTable);
      this.copyingTable = false;
    }, 200)
  }

  async viewWeatherData(predictorEntry: IdbPredictorData) {
    // let predictor: PredictorData = predictorEntry.predictors.find(pData => { return pData.predictorType == 'Weather' });
    // let weatherStation: WeatherStation = await this.degreeDaysService.getStationById(predictor.weatherStationId);
    // this.weatherDataService.selectedStation = weatherStation;
    // if (predictor.weatherDataType == 'CDD') {
    //   this.weatherDataService.coolingTemp = predictor.coolingBaseTemperature;
    //   let predictorPair: PredictorData = predictorEntry.predictors.find(predictorPair => { return predictorPair.weatherStationId == predictor.weatherStationId && predictorPair.weatherDataType == 'HDD' });
    //   if (predictorPair) {
    //     this.weatherDataService.heatingTemp = predictorPair.heatingBaseTemperature;
    //     this.weatherDataService.weatherDataSelection = 'degreeDays';
    //   } else {
    //     this.weatherDataService.weatherDataSelection = 'CDD';
    //   }
    // } else {
    //   this.weatherDataService.heatingTemp = predictor.heatingBaseTemperature;
    //   let predictorPair: PredictorData = predictorEntry.predictors.find(predictorPair => { return predictorPair.weatherStationId == predictor.weatherStationId && predictorPair.weatherDataType == 'CDD' });
    //   if (predictorPair) {
    //     this.weatherDataService.coolingTemp = predictorPair.coolingBaseTemperature;
    //     this.weatherDataService.weatherDataSelection = 'degreeDays';
    //   } else {
    //     this.weatherDataService.weatherDataSelection = 'HDD';
    //   }
    // }
    // let entryDate: Date = new Date(predictorEntry.date);
    // this.weatherDataService.selectedYear = entryDate.getFullYear();
    // this.weatherDataService.selectedDate = entryDate;
    // this.weatherDataService.selectedMonth = entryDate;
    // let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    // this.weatherDataService.selectedFacility = selectedFacility;
    // this.weatherDataService.zipCode = selectedFacility.zip;
    // this.router.navigateByUrl('weather-data/monthly-station');
  }

  setHasWeatherDataWarning() {
    // let allPredictorData: Array<PredictorData> = this.facilityPredictorEntries.flatMap(entry => { return entry.predictors });
    // let findError: PredictorData = allPredictorData.find(data => {
    //   return data.predictorType == 'Weather' && data.weatherDataWarning;
    // });
    // this.hasWeatherDataWarnings = findError != undefined;
  }

  goToWeatherData() {
    // let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    // this.weatherDataService.selectedFacility = facility;
    // let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    // this.weatherDataService.selectedFacility = selectedFacility;
    // this.weatherDataService.zipCode = selectedFacility.zip;
    // this.router.navigateByUrl('/weather-data');
  }
}
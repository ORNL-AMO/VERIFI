import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import * as _ from 'lodash';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { WeatherStation } from 'src/app/models/degreeDays';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { PredictorDataHelperService } from 'src/app/shared/helper-services/predictor-data-helper.service';

@Component({
    selector: 'app-predictors-data-table',
    templateUrl: './predictors-data-table.component.html',
    styleUrl: './predictors-data-table.component.css',
    standalone: false
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
  hasWeatherDataWarnings: boolean = false;
  predictor: IdbPredictor;

  inDataWizard: boolean;
  paramSub: Subscription;
  latestMeterDataReading: Date;
  filterErrors: boolean = false;
  hasCalculatedOverride: boolean = false;
  constructor(private activatedRoute: ActivatedRoute, private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private sharedDataService: SharedDataService,
    private router: Router,
    private copyTableService: CopyTableService,
    private facilityDbService: FacilitydbService,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private weatherDataService: WeatherDataService,
    private predictorDataHelperService: PredictorDataHelperService
  ) {

  }

  ngOnInit() {
    this.predictorDataSub = this.predictorDataDbService.facilityPredictorData.subscribe(() => {
      this.setPredictorData();
    });
    this.setInDataWizard();
    if (this.inDataWizard) {
      this.paramSub = this.activatedRoute.params.subscribe(params => {
        let predictorId: string = params['id'];
        this.predictor = this.predictorDbService.getByGuid(predictorId);
        this.setPredictorData();
      });
    } else {
      this.paramSub = this.activatedRoute.parent.params.subscribe(params => {
        let predictorId: string = params['id'];
        this.predictor = this.predictorDbService.getByGuid(predictorId);
        this.setPredictorData();
      });
    }

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.itemsPerPageSub.unsubscribe();
    this.predictorDataSub.unsubscribe();
    this.paramSub.unsubscribe();
  }

  setInDataWizard() {
    this.inDataWizard = this.router.url.includes('data-wizard');
  }

  setPredictorData() {
    if (this.predictor) {
      this.setLatestMeterDataReading();
      this.predictorData = this.predictorDataDbService.getByPredictorId(this.predictor.guid);
      this.setHasWeatherDataWarning();
      if (this.filterErrors) {
        this.filterErrors = false;
      }
    }
  }

  setLatestMeterDataReading() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let results = this.predictorDataHelperService.checkWeatherPredictorsNeedUpdate(facility, [this.predictor]);
    if (results.length > 0) {
      this.latestMeterDataReading = this.predictorDataHelperService.getLastMeterDate(facility);
    } else {
      this.latestMeterDataReading = undefined;
    }
  }

  async addPredictorEntry() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (this.inDataWizard) {
      let newEntry: IdbPredictorData = getNewIdbPredictorData(this.predictor, this.predictorData);
      newEntry = await firstValueFrom(this.predictorDataDbService.addWithObservable(newEntry));
      let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      await this.dbChangesService.setPredictorDataV2(account, selectedFacility);
      this.toastNotificationService.showToast('Predictor Added!', undefined, undefined, false, 'alert-success');
      this.setEditPredictorData(newEntry);
    } else {
      this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/predictors/predictor/' + this.predictor.guid + '/add-entry');
    }
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
    if (this.inDataWizard) {
      this.router.navigateByUrl('data-wizard/' + predictorEntry.accountId + '/facilities/' + predictorEntry.facilityId + '/predictors/' + predictorEntry.predictorId + '/predictor-data/edit-entry/' + predictorEntry.guid);
    } else {
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/predictors/predictor/' + this.predictor.guid + '/edit-entry/' + predictorEntry.guid);
    }
  }

  uploadData() {
    if (this.inDataWizard) {
      this.router.navigateByUrl('data-wizard/' + this.predictor.accountId + '/facilities/' + this.predictor.facilityId + '/predictors/' + this.predictor.guid + '/predictor-data');
    } else {
      this.router.navigateByUrl('/upload');
    }
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
    let weatherStation: WeatherStation = await this.weatherDataService.getStation(this.predictor.weatherStationId);
    if (weatherStation) {
      this.weatherDataService.selectedStation = weatherStation;
      this.weatherDataService.weatherDataSelection = this.predictor.weatherDataType;
      if (this.predictor.weatherDataType == 'CDD') {
        this.weatherDataService.coolingTemp = this.predictor.coolingBaseTemperature;
      } else if (this.predictor.weatherDataType == 'HDD') {
        this.weatherDataService.heatingTemp = this.predictor.heatingBaseTemperature;
      }
    }
  }

  setHasWeatherDataWarning() {
    if (this.predictor.predictorType == 'Weather') {
      this.hasWeatherDataWarnings = this.predictorData.find(data => {
        return data.weatherDataWarning;
      }) != undefined;
      this.hasCalculatedOverride = this.predictorData.find(data => {
        return data.weatherOverride;
      }) != undefined;
    } else {
      this.hasWeatherDataWarnings = false;
      this.hasCalculatedOverride = false;
    }
  }

  goToWeatherData() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.weatherDataService.selectedFacility = facility;
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.weatherDataService.selectedFacility = selectedFacility;
    this.weatherDataService.zipCode = selectedFacility.zip;
    this.router.navigateByUrl('/weather-data');
  }

  showUpdateEntries() {
    if(this.inDataWizard){     
       this.router.navigateByUrl('data-wizard/' + this.predictor.accountId + '/facilities/' + this.predictor.facilityId + '/predictors/' + this.predictor.guid + '/predictor-data/update-calculated-entries');
    }else{
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/predictors/predictor/' + this.predictor.guid + '/update-calculated-entries');
    }

  }

  toggleFilterErrors() {
    this.filterErrors = !this.filterErrors;
  }
}

import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbFacility, IdbPredictorEntry, PredictorData } from 'src/app/models/idb';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import * as _ from 'lodash';
import { WeatherDataService } from 'src/app/weather-data/weather-data.service';
import { DegreeDaysService } from 'src/app/shared/helper-services/degree-days.service';
import { WeatherStation } from 'src/app/models/degreeDays';

@Component({
  selector: 'app-predictor-entries-table',
  templateUrl: './predictor-entries-table.component.html',
  styleUrls: ['./predictor-entries-table.component.css']
})
export class PredictorEntriesTableComponent {
  @ViewChild('predictorTable', { static: false }) predictorTable: ElementRef;

  facilityPredictors: Array<PredictorData>;
  facilityPredictorsSub: Subscription;
  facilityPredictorEntries: Array<IdbPredictorEntry>;
  facilityPredictorEntriesSub: Subscription;
  predictorEntryToDelete: IdbPredictorEntry;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  currentPageNumber: number = 1;
  allChecked: boolean = false;
  hasCheckedItems: boolean = false;
  showBulkDelete: boolean = false;
  orderDataField: string = 'date';
  orderByDirection: string = 'desc';
  hasData: boolean;
  hasWeatherData: boolean;
  copyingTable: boolean = false;
  hasWeatherDataWarnings: boolean = false;
  constructor(private predictorsDbService: PredictordbService, private router: Router, private loadingService: LoadingService,
    private facilityDbService: FacilitydbService, private toastNotificationsService: ToastNotificationsService,
    private sharedDataService: SharedDataService, private copyTableService: CopyTableService,
    private weatherDataService: WeatherDataService, private degreeDaysService: DegreeDaysService) { }

  ngOnInit(): void {
    this.facilityPredictorsSub = this.predictorsDbService.facilityPredictors.subscribe(predictors => {
      this.facilityPredictors = predictors;
      this.setHasData();
    });

    this.facilityPredictorEntriesSub = this.predictorsDbService.facilityPredictorEntries.subscribe(entries => {
      this.facilityPredictorEntries = entries;
      this.setHasChecked();
      this.setHasData();
      if (this.hasWeatherData) {
        this.setHasWeatherDataWarning();
      }
    });

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.facilityPredictorsSub.unsubscribe();
    this.facilityPredictorEntriesSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
  }

  setHasData() {
    this.hasData = (this.facilityPredictors && this.facilityPredictors.length != 0) || (this.facilityPredictorEntries && this.facilityPredictorEntries.length != 0);
    if (this.hasData) {
      let findPredictor: PredictorData = this.facilityPredictors.find(predictor => { return predictor.predictorType == 'Weather' });
      this.hasWeatherData = findPredictor != undefined;
    } else {
      this.hasWeatherData = false;
    }
  }


  addPredictorEntry() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/predictors/entries/add-entry');
  }

  setDeletePredictorEntry(predictorEntry: IdbPredictorEntry) {
    this.predictorEntryToDelete = predictorEntry;
  }

  async confirmDeletePredictorEntry() {
    this.loadingService.setLoadingMessage('Deleting Predictor Entry...');
    this.loadingService.setLoadingStatus(true);
    await firstValueFrom(this.predictorsDbService.deleteIndexWithObservable(this.predictorEntryToDelete.id));
    this.cancelDeletePredictorEntry();
    await this.finishDelete();
  }

  cancelDeletePredictorEntry() {
    this.predictorEntryToDelete = undefined;
  }

  setEditPredictorEntry(predictorEntry: IdbPredictorEntry) {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/predictors/entries/edit-entry/' + predictorEntry.guid);
  }

  uploadData() {
    this.router.navigateByUrl('/upload');
  }

  checkAll() {
    let orderedItems: Array<IdbPredictorEntry> = this.getOrderedData();
    let displayedItems: Array<IdbPredictorEntry> = orderedItems.slice(((this.currentPageNumber - 1) * this.itemsPerPage), (this.currentPageNumber * this.itemsPerPage))
    displayedItems.forEach(item => {
      item.checked = this.allChecked;
    });
    this.hasCheckedItems = (this.allChecked == true);
  }

  getOrderedData(): Array<IdbPredictorEntry> {
    if (this.orderDataField == 'date') {
      return _.orderBy(this.facilityPredictorEntries, this.orderDataField, this.orderByDirection)
    } else {
      return _.orderBy(this.facilityPredictorEntries, (data: IdbPredictorEntry) => {
        let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.name == this.orderDataField });
        if (predictorData) {
          return predictorData.amount;
        } else {
          return;
        }
      }, this.orderByDirection);
    }
  }

  setHasChecked() {
    let hasChecked: boolean = false;
    let predictorEntries: Array<IdbPredictorEntry> = this.getOrderedData();
    let displayedItems: Array<IdbPredictorEntry> = predictorEntries.slice(((this.currentPageNumber - 1) * this.itemsPerPage), (this.currentPageNumber * this.itemsPerPage))
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
    let checkedItems: Array<IdbPredictorEntry> = new Array();
    this.facilityPredictorEntries.forEach(entry => {
      if (entry.checked == true) {
        checkedItems.push(entry);
      }
    })
    for (let index = 0; index < checkedItems.length; index++) {
      await firstValueFrom(this.predictorsDbService.deleteIndexWithObservable(checkedItems[index].id));
    }

    this.allChecked = false;
    this.cancelBulkDelete();
    await this.finishDelete();
  }

  async finishDelete() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let accountPredictors: Array<IdbPredictorEntry> = await this.predictorsDbService.getAllAccountPredictors(selectedFacility.accountId);
    this.predictorsDbService.accountPredictorEntries.next(accountPredictors);
    let facilityPredictors: Array<IdbPredictorEntry> = accountPredictors.filter(predictor => { return predictor.facilityId == selectedFacility.guid });
    this.predictorsDbService.facilityPredictorEntries.next(facilityPredictors);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Predictor Data Deleted!", undefined, undefined, false, "alert-success");
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

  async viewWeatherData(predictorEntry: IdbPredictorEntry) {
    let predictor: PredictorData = predictorEntry.predictors.find(pData => { return pData.predictorType == 'Weather' });
    let weatherStation: WeatherStation = await this.degreeDaysService.getStationById(predictor.weatherStationId);
    this.weatherDataService.selectedStation = weatherStation;
    if (predictor.weatherDataType == 'CDD') {
      this.weatherDataService.coolingTemp = predictor.coolingBaseTemperature;
      let predictorPair: PredictorData = predictorEntry.predictors.find(predictorPair => { return predictorPair.weatherStationId == predictor.weatherStationId && predictorPair.weatherDataType == 'HDD' });
      if (predictorPair) {
        this.weatherDataService.heatingTemp = predictorPair.heatingBaseTemperature;
      }
    } else {
      this.weatherDataService.heatingTemp = predictor.heatingBaseTemperature;
      let predictorPair: PredictorData = predictorEntry.predictors.find(predictorPair => { return predictorPair.weatherStationId == predictor.weatherStationId && predictorPair.weatherDataType == 'CDD' });
      if (predictorPair) {
        this.weatherDataService.coolingTemp = predictorPair.coolingBaseTemperature;
      }
    }
    let entryDate: Date = new Date(predictorEntry.date);
    this.weatherDataService.selectedYear = entryDate.getFullYear();
    this.weatherDataService.selectedDate = entryDate;
    this.weatherDataService.selectedMonth = entryDate;
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.weatherDataService.selectedFacility = selectedFacility;
    this.weatherDataService.zipCode = selectedFacility.zip;
    this.router.navigateByUrl('weather-data/monthly-station');
  }

  setHasWeatherDataWarning() {
    let allPredictorData: Array<PredictorData> = this.facilityPredictorEntries.flatMap(entry => { return entry.predictors });
    let findError: PredictorData = allPredictorData.find(data => {
      return data.predictorType == 'Weather' && data.weatherDataWarning;
    });
    this.hasWeatherDataWarnings = findError != undefined;
  }
  
  goToWeatherData() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.weatherDataService.selectedFacility = facility;
    this.router.navigateByUrl('/weather-data');
  }
}

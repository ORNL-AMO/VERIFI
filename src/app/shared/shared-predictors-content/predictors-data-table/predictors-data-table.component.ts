import { Component, computed, ElementRef, inject, signal, Signal, ViewChild, WritableSignal } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
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
import { getWeatherSearchFromFacility } from 'src/app/shared/sharedHelperFunctions';
import { getDateFromPredictorData } from '../../dateHelperFunctions';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountStatusCheckService } from '../../helper-services/account-status-check.service';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { PredictorStatusCheck } from 'src/app/calculations/status-check-calculations/predictorStatusCheck';

type OrderDataField = 'date' | 'amount';

@Component({
  selector: 'app-predictors-data-table',
  templateUrl: './predictors-data-table.component.html',
  styleUrl: './predictors-data-table.component.css',
  standalone: false
})
export class PredictorsDataTableComponent {
  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private predictorDbService: PredictorDbService = inject(PredictorDbService);
  private predictorDataDbService: PredictorDataDbService = inject(PredictorDataDbService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private router: Router = inject(Router);
  private copyTableService: CopyTableService = inject(CopyTableService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private loadingService: LoadingService = inject(LoadingService);
  private toastNotificationService: ToastNotificationsService = inject(ToastNotificationsService);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private weatherDataService: WeatherDataService = inject(WeatherDataService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  @ViewChild('predictorTable', { static: false }) predictorTable: ElementRef;
  copyingTable: boolean = false;

  itemsPerPage: Signal<number> = toSignal(this.sharedDataService.itemsPerPage, { initialValue: 10 });
  private facilityPredictors: Signal<Array<IdbPredictor>> = toSignal(this.predictorDbService.facilityPredictors, { initialValue: [] });
  private facilityPredictorData: Signal<Array<IdbPredictorData>> = toSignal(this.predictorDataDbService.facilityPredictorData, { initialValue: [] });
  private facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);
  private facility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility, { initialValue: undefined });
  private params: Signal<Params> = toSignal(this.activatedRoute.params, { initialValue: { id: undefined } });
  private parentParams: Signal<Params> = toSignal(this.activatedRoute.parent.params, { initialValue: { id: undefined } });

  predictor: Signal<IdbPredictor> = computed(() => {
    const params = this.params();
    const parentParams = this.parentParams();
    const predictors = this.facilityPredictors();
    if (this.router.url.includes('data-management')) {
      let predictorId: string = params['id'];
      return predictors.find(predictor => predictor.guid === predictorId);
    } else {
      let predictorId: string = parentParams['id'];
      return predictors.find(predictor => predictor.guid === predictorId);
    }
  });

  predictorData: Signal<Array<IdbPredictorData>> = computed(() => {
    const predictor = this.predictor();
    const predictorData = this.facilityPredictorData();
    if (predictor) {
      return predictorData.filter(data => data.predictorId === predictor.guid);
    } else {
      return [];
    }
  });

  orderedPredictorData: Signal<Array<IdbPredictorData>> = computed(() => {
    const predictorData = this.predictorData();
    const orderDataField = this.orderDataField();
    const orderByDirection = this.orderByDirection();
    const filterErrors = this.filterErrors();
    const filteredData = filterErrors ? predictorData.filter(data => data.weatherDataWarning) : predictorData;
    if (orderDataField == 'amount') {
      return _.orderBy(filteredData, [data => data.amount], [orderByDirection]);
    } else if (orderDataField == 'date') {
      return _.orderBy(filteredData, [data => getDateFromPredictorData(data)], [orderByDirection]);
    }
    return filteredData;
  });

  predictorStatusCheck: Signal<PredictorStatusCheck> = computed(() => {
    const predictor = this.predictor();
    const facilityStatusCheck = this.facilityStatusCheck();
    if (predictor && facilityStatusCheck) {
      return facilityStatusCheck.predictorsStatusChecks.find(check => check.predictorId === predictor.guid);
    } else {
      return undefined;
    }
  });

  hasCalculatedOverride: Signal<boolean> = computed(() => {
    const predictorData = this.predictorData();
    return predictorData.some(data => data.weatherOverride);
  });

  hasCheckedItems: Signal<boolean> = computed(() => {
    const orderedData = this.orderedPredictorData();
    const displayedItems = orderedData.slice(((this.currentPageNumber - 1) * this.itemsPerPage()), (this.currentPageNumber * this.itemsPerPage()));
    const checkedIds = this.checkedItemGuids();
    return displayedItems.some(item => checkedIds.has(item.guid));
  });

  orderDataField: WritableSignal<OrderDataField> = signal('date');
  orderByDirection: WritableSignal<'asc' | 'desc'> = signal('desc');
  filterErrors: WritableSignal<boolean> = signal(false);
  checkedItemGuids: WritableSignal<Set<string>> = signal(new Set<string>());

  predictorDataToDelete: IdbPredictorData;
  inDataManagement: boolean;
  currentPageNumber: number = 1;
  allChecked: boolean = false;
  showBulkDelete: boolean = false;

  ngOnInit() {
    this.inDataManagement = this.router.url.includes('data-management');
  }

  isChecked(guid: string): boolean {
    return this.checkedItemGuids().has(guid);
  }

  toggleChecked(guid: string) {
    this.checkedItemGuids.update(set => {
      const next = new Set(set);
      next.has(guid) ? next.delete(guid) : next.add(guid);
      return next;
    });
    const orderedData = this.orderedPredictorData();
    const displayedItems = orderedData.slice(((this.currentPageNumber - 1) * this.itemsPerPage()), (this.currentPageNumber * this.itemsPerPage()));
    this.allChecked = displayedItems.every(item => this.checkedItemGuids().has(item.guid));
  }

  async addPredictorEntry() {
    const selectedFacility: IdbFacility = this.facility();
    const predictor: IdbPredictor = this.predictor();
    const predictorData: Array<IdbPredictorData> = this.predictorData();
    if (this.inDataManagement) {
      let newEntry: IdbPredictorData = getNewIdbPredictorData(predictor, predictorData);
      newEntry = await firstValueFrom(this.predictorDataDbService.addWithObservable(newEntry));
      const account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      await this.dbChangesService.setPredictorDataV2(account, true, selectedFacility);
      this.toastNotificationService.showToast('Predictor Added!', undefined, undefined, false, 'alert-success');
      this.setEditPredictorData(newEntry);
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid + '/utility/predictors/predictor/' + predictor.guid + '/add-entry');
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
    if (this.inDataManagement) {
      this.router.navigateByUrl('data-management/' + predictorEntry.accountId + '/facilities/' + predictorEntry.facilityId + '/predictors/' + predictorEntry.predictorId + '/predictor-data/edit-entry/' + predictorEntry.guid);
    } else {
      const selectedFacility: IdbFacility = this.facility();
      this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid + '/utility/predictors/predictor/' + this.predictor().guid + '/edit-entry/' + predictorEntry.guid);
    }
  }

  uploadData() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.router.navigateByUrl('/data-management/' + selectedAccount.guid + '/import-data');
  }

  checkAll() {
    const orderedItems = this.orderedPredictorData();
    const displayedItems = orderedItems.slice(((this.currentPageNumber - 1) * this.itemsPerPage()), (this.currentPageNumber * this.itemsPerPage()));
    this.checkedItemGuids.update(set => {
      const next = new Set(set);
      displayedItems.forEach(item => {
        this.allChecked ? next.add(item.guid) : next.delete(item.guid);
      });
      return next;
    });
  }

  openBulkDelete() {
    this.showBulkDelete = true;
  }

  cancelBulkDelete() {
    this.showBulkDelete = false;
  }

  async bulkDelete() {
    this.cancelBulkDelete();
    this.loadingService.setLoadingMessage("Deleting Predictor Entries...");
    this.loadingService.setLoadingStatus(true);
    const checkedIds = this.checkedItemGuids();
    const checkedItems = this.predictorData().filter(entry => checkedIds.has(entry.guid));
    for (let index = 0; index < checkedItems.length; index++) {
      await firstValueFrom(this.predictorDataDbService.deleteIndexWithObservable(checkedItems[index].id));
    }
    this.allChecked = false;
    this.checkedItemGuids.set(new Set());
    await this.finishDelete();
  }

  async finishDelete() {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setPredictorDataV2(account, true, selectedFacility);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast("Predictor Data Deleted!", undefined, undefined, false, "alert-success");
  }


  setOrderDataField(str: OrderDataField) {
    if (str == this.orderDataField()) {
      if (this.orderByDirection() == 'desc') {
        this.orderByDirection.set('asc');
      } else {
        this.orderByDirection.set('desc');
      }
    } else {
      this.orderDataField.set(str);
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
    const predictor = this.predictor();
    //ISSUE 1822
    let weatherStation: WeatherStation | 'error' = await this.weatherDataService.getStation(predictor.weatherStationId);
    // let weatherStation: WeatherStation | 'error' = await this.degreeDaysService.getStationById(this.predictor.weatherStationId);
    if (weatherStation != 'error') {
      if (weatherStation) {
        this.weatherDataService.selectedStation = weatherStation;
        this.weatherDataService.weatherDataSelection = predictor.weatherDataType;
        if (predictor.weatherDataType == 'CDD') {
          this.weatherDataService.coolingTemp = predictor.coolingBaseTemperature;
        } else if (predictor.weatherDataType == 'HDD') {
          this.weatherDataService.heatingTemp = predictor.heatingBaseTemperature;
        }
      }
      let entryDate: Date = getDateFromPredictorData(predictorEntry);
      this.weatherDataService.selectedYear = entryDate.getFullYear();
      this.weatherDataService.selectedDate = entryDate;
      this.weatherDataService.selectedMonth = entryDate;
      const selectedFacility: IdbFacility = this.facility();
      this.weatherDataService.selectedFacility = selectedFacility;
      this.weatherDataService.addressSearchStr = getWeatherSearchFromFacility(selectedFacility);
      //TODO: Update to new route
      if (this.inDataManagement) {
        this.router.navigateByUrl('/data-management/' + selectedFacility.accountId + '/weather-data/monthly-station');
      } else {
        this.router.navigateByUrl('/data-evaluation/weather-data');
      }
    } else {
      this.toastNotificationService.showToast('An Error Occured', undefined, undefined, false, 'alert-danger');
    }
  }

  goToWeatherData() {
    const facility: IdbFacility = this.facility();
    this.weatherDataService.selectedFacility = facility;
    this.weatherDataService.addressSearchStr = getWeatherSearchFromFacility(facility);
    if (this.inDataManagement) {
      this.router.navigateByUrl('/data-management/' + facility.accountId + '/weather-data');
    } else {
      this.router.navigateByUrl('/data-evaluation/weather-data');
    }
  }

  showUpdateEntries() {
    const predictor = this.predictor();
    const facility = this.facility();
    if (this.inDataManagement) {
      this.router.navigateByUrl('data-management/' + facility.accountId + '/facilities/' + facility.guid + '/predictors/' + predictor.guid + '/predictor-data/update-calculated-entries');
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/utility/predictors/predictor/' + predictor.guid + '/update-calculated-entries');
    }
  }

  toggleFilterErrors() {
    this.filterErrors.set(!this.filterErrors());
  }

  goToDataQualityReport() {
    const predictor = this.predictor();
    const facility = this.facility();
    this.router.navigateByUrl('/data-management/' + facility.accountId + '/facilities/' + facility.guid + '/predictors/' + predictor.guid + '/data-quality-report');
  }
}

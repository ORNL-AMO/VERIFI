import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import * as _ from 'lodash';
import { EditMeterFormService } from '../../edit-meter-form/edit-meter-form.service';
import { getHasDuplicateReadings } from 'src/app/shared/helper-pipes/invalid-meter-data.pipe';

@Component({
  selector: 'app-meter-data-table',
  templateUrl: './meter-data-table.component.html',
  styleUrl: './meter-data-table.component.css',
  standalone: false
})
export class MeterDataTableComponent {
  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  selectedMeter: IdbUtilityMeter;
  meterData: Array<IdbUtilityMeterData>;
  facilityMeters: Array<IdbUtilityMeter>;
  accountMeterDataSub: Subscription;
  hasCheckedItems: boolean;
  meterDataToDelete: IdbUtilityMeterData;
  showDeleteModal: boolean = false;
  showBulkDelete: boolean = false;
  showIndividualDelete: boolean = false;
  paramsSub: Subscription;
  showFilterDropdown: boolean = false;

  inDataManagement: boolean;
  hasNegativeReadings: boolean;
  duplicateReadingDates: Array<Date>;
  filteredMeterData: Array<IdbUtilityMeterData>;
  optionSelected: 'all' | 'estimated' = 'all';
  hasEstimatedReadings: boolean = false;
  isMeterInvalid: boolean;
  constructor(
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private loadingService: LoadingService,
    private toastNoticationService: ToastNotificationsService,
    private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService,
    private dbChangesService: DbChangesService,
    private sharedDataService: SharedDataService,
    private editMeterFormService: EditMeterFormService
  ) { }

  ngOnInit(): void {
    this.setInDataManagement();
    this.paramsSub = this.activatedRoute.parent.params.subscribe(params => {
      this.showFilterDropdown = false;
      this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
      let meterId: string = params['id'];
      this.selectedMeter = this.facilityMeters.find(meter => { return meter.guid == meterId });
      this.isMeterInvalid = this.editMeterFormService.getFormFromMeter(this.selectedMeter).invalid;
      this.setData();
      this.optionSelected = 'all';
    });

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(data => {
      this.setData();
    });

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
    this.paramsSub.unsubscribe();
  }

  setInDataManagement() {
    this.inDataManagement = this.router.url.includes('data-management');
  }

  setData() {
    if (this.isMeterInvalid == false) {
      this.meterData = this.utilityMeterDataDbService.getMeterDataFromMeterId(this.selectedMeter.guid);
      this.filteredMeterData = [...this.meterData];
      this.hasNegativeReadings = this.meterData.findIndex(mData => {
        return mData.totalEnergyUse < 0
      }) != -1;
      this.duplicateReadingDates = getHasDuplicateReadings(this.meterData).map(dateStr => {
        let dateParts: Array<string> = dateStr.split('_');
        return new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
      });
      this.setHasCheckedItems();
      this.hasEstimatedReadings = this.meterData.findIndex(mData => {
        return mData.isEstimated == true;
      }) != -1;
    }
  }

  uploadData() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.router.navigateByUrl('/data-management/' + selectedAccount.guid + '/import-data');
  }

  async bulkDelete() {
    this.cancelBulkDelete();
    this.loadingService.setLoadingMessage("Deleting Meter Data...");
    this.loadingService.setLoadingStatus(true);
    let meterDataItemsToDelete: Array<IdbUtilityMeterData> = new Array();
    this.meterData.forEach(dataItem => {
      if (dataItem.checked) {
        meterDataItemsToDelete.push(dataItem);
      }
    });
    for (let index = 0; index < meterDataItemsToDelete.length; index++) {
      await firstValueFrom(this.utilityMeterDataDbService.deleteWithObservable(meterDataItemsToDelete[index].id));
    }
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeterData(selectedAccount, true, selectedFacility);
    this.loadingService.setLoadingStatus(false);
    this.toastNoticationService.showToast("Meter Data Deleted!", undefined, undefined, false, "alert-success");
  }

  setDeleteMeterData(meterData: IdbUtilityMeterData) {
    this.sharedDataService.modalOpen.next(true);
    this.meterDataToDelete = meterData;
    this.showIndividualDelete = true;
  }

  cancelDelete() {
    this.sharedDataService.modalOpen.next(false);
    this.showIndividualDelete = false;
    this.meterDataToDelete = undefined;
  }

  async deleteMeterData() {
    this.loadingService.setLoadingMessage("Deleting Meter Data...");
    this.loadingService.setLoadingStatus(true);
    this.showIndividualDelete = false;
    await firstValueFrom(this.utilityMeterDataDbService.deleteWithObservable(this.meterDataToDelete.id));
    this.loadingService.setLoadingMessage("Meter Data Deleted...");
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.loadingService.setLoadingMessage("Setting Meter Data...");
    await this.dbChangesService.setMeterData(selectedAccount, true, selectedFacility);
    this.loadingService.setLoadingMessage("Meter Data Set...");
    this.loadingService.setLoadingStatus(false);
    this.toastNoticationService.showToast("Meter Data Deleted!", undefined, undefined, false, "alert-success");
    this.cancelDelete();
  }

  setHasCheckedItems() {
    this.hasCheckedItems = this.meterData.find(dataItem => { return dataItem.checked == true }) != undefined;
  }

  openBulkDelete() {
    this.sharedDataService.modalOpen.next(true);
    this.showBulkDelete = true;
  }

  cancelBulkDelete() {
    this.sharedDataService.modalOpen.next(false);
    this.showBulkDelete = false;
  }

  meterDataAdd() {
    this.showFilterDropdown = false;
    if (this.inDataManagement) {
      this.router.navigateByUrl('/data-management/' + this.selectedMeter.accountId + '/facilities/' + this.selectedMeter.facilityId + '/meters/' + this.selectedMeter.guid + '/meter-data/new-bill');
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedMeter.facilityId + '/utility/energy-consumption/utility-meter/' + this.selectedMeter.guid + '/new-bill');
    }
  }

  setEditMeterData(meterData: IdbUtilityMeterData) {
    this.showFilterDropdown = false;
    if (this.inDataManagement) {
      this.router.navigateByUrl('/data-management/' + this.selectedMeter.accountId + '/facilities/' + this.selectedMeter.facilityId + '/meters/' + this.selectedMeter.guid + '/meter-data/edit-bill/' + meterData.guid);
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedMeter.facilityId + '/utility/energy-consumption/utility-meter/' + this.selectedMeter.guid + '/edit-bill/' + meterData.guid);
    }
  }

  toggleFilterMenu() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  goToDataQualityReport() {
    this.router.navigateByUrl('/data-management/' + this.selectedMeter.accountId + '/facilities/' + this.selectedMeter.facilityId + '/meters/' + this.selectedMeter.guid + '/data-quality-report');
  }

  filterEstimatedReadings() {
    if (this.optionSelected === 'estimated')
      this.filteredMeterData = this.meterData.filter(data => { return data.isEstimated == true });
    else
      this.filteredMeterData = [...this.meterData];
  }

  editMeter() {
    if (this.inDataManagement) {
      this.router.navigateByUrl('/data-management/' + this.selectedMeter.accountId + '/facilities/' + this.selectedMeter.facilityId + '/meters/' + this.selectedMeter.guid);
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedMeter.facilityId + '/utility/energy-consumption/energy-source/edit-meter/' + this.selectedMeter.guid);
    }
  }
}

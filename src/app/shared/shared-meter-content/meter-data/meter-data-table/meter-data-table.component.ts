import { Component } from '@angular/core';
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

@Component({
  selector: 'app-meter-data-table',
  templateUrl: './meter-data-table.component.html',
  styleUrl: './meter-data-table.component.css'
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

  inDataWizard: boolean;
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
    private sharedDataService: SharedDataService
  ) { }

  ngOnInit(): void {
    this.setInDataWizard();
    this.paramsSub = this.activatedRoute.parent.params.subscribe(params => {
      //TODO: update for int
      this.showFilterDropdown = false;
      this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
      if (this.inDataWizard) {
        let meterId: string = params['id'];
        this.selectedMeter = this.facilityMeters.find(meter => { return meter.guid == meterId });
      } else {
        let meterId: number = parseInt(params['id']);
        this.selectedMeter = this.facilityMeters.find(meter => { return meter.id == meterId });
      }
      this.setData();
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

  setInDataWizard() {
    this.inDataWizard = this.router.url.includes('data-wizard');
  }

  setData() {
    this.meterData = this.utilityMeterDataDbService.getMeterDataFromMeterId(this.selectedMeter.guid);
    this.setHasCheckedItems();
  }

  uploadData() {
    this.router.navigateByUrl('/upload');
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
    await this.dbChangesService.setMeterData(selectedAccount, selectedFacility);
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
    await this.dbChangesService.setMeterData(selectedAccount, selectedFacility);
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
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (this.inDataWizard) {
      this.router.navigateByUrl('/data-wizard/' + this.selectedMeter.accountId + '/facilities/' + this.selectedMeter.facilityId + '/meters/meter-data/' + this.selectedMeter.guid + '/new-bill');
    } else {
      this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/energy-consumption/utility-meter/' + this.selectedMeter.id + '/new-bill');
    }
  }

  setEditMeterData(meterData: IdbUtilityMeterData) {
    this.showFilterDropdown = false;
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (this.inDataWizard) {
      this.router.navigateByUrl('/data-wizard/' + this.selectedMeter.accountId + '/facilities/' + this.selectedMeter.facilityId + '/meters/meter-data/' + this.selectedMeter.guid + '/edit-bill/' + meterData.guid);
    } else {
      this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/energy-consumption/utility-meter/' + this.selectedMeter.id + '/edit-bill/' + meterData.id);
    }
  }

  toggleFilterMenu() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }
}

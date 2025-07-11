import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
import { getHasDuplicateReadings } from '../../../../../shared/helper-pipes/invalid-meter.pipe';

@Component({
  selector: 'app-utility-meter-data-table',
  templateUrl: './utility-meter-data-table.component.html',
  styleUrls: ['./utility-meter-data-table.component.css'],
  standalone: false
})
export class UtilityMeterDataTableComponent implements OnInit {

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
  hasNegativeReadings: boolean;
  duplicateReadingDates: Array<Date>;
  @ViewChild('openModalBtn') openModalBtn: ElementRef;
  meterName: string;
  showGraphs: boolean = false;
  activeGraph: string;
  energyOutlierCount: number = 0;
  costOutlierCount: number = 0;
  showAlert: boolean = false;
  expandSection: string = '';

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
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(params => {
      let meterId: number = parseInt(params['id']);
      this.showFilterDropdown = false;
      this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
      this.selectedMeter = this.facilityMeters.find(meter => { return meter.id == meterId });
      this.setData();
    });

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(data => {
      this.setData();
    });

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngAfterViewInit() {
    const modal = document.getElementById('dataQualityModal');
    if (modal) {
      modal.addEventListener('show.bs.modal', () => {
        this.activeGraph = 'statistics';
      });

      modal.addEventListener('shown.bs.modal', () => {
        this.showGraphs = true;
        if (!this.showAlert) {
          this.expandSection = 'statistics';
        }
      });

      modal.addEventListener('hidden.bs.modal', () => {
        this.showGraphs = false;
        this.showAlert = false;
        this.activeGraph = '';
        this.expandSection = '';
      });
    }
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
    this.paramsSub.unsubscribe();
  }

  setData() {
    this.meterData = this.utilityMeterDataDbService.getMeterDataFromMeterId(this.selectedMeter.guid);
    this.hasNegativeReadings = this.meterData.findIndex(mData => {
      return mData.totalEnergyUse < 0
    }) != -1;
    this.duplicateReadingDates = getHasDuplicateReadings(this.selectedMeter.guid, this.meterData);
    this.setHasCheckedItems();
    this.meterName = this.meterData[0].meterNumber.split(' ').slice(1).join(' ');
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
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/energy-consumption/utility-meter/' + this.selectedMeter.id + '/new-bill');
  }

  setEditMeterData(meterData: IdbUtilityMeterData) {
    this.showFilterDropdown = false;
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('facility/' + selectedFacility.id + '/utility/energy-consumption/utility-meter/' + this.selectedMeter.id + '/edit-bill/' + meterData.id);
  }

  toggleFilterMenu() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  onModalClose() {
    this.openModalBtn.nativeElement.focus();
  }

  selectOption(option: string) {
    this.activeGraph = option;
  }

  onOutlierDetection(outlierCount: { energy: number; cost: number }) {
    this.energyOutlierCount = outlierCount.energy;
    this.costOutlierCount = outlierCount.cost;
    if (this.energyOutlierCount > 0 || this.costOutlierCount > 0) {
      this.showAlert = true;
    } else {
      this.showAlert = false;
    }
    this.expandSection = this.showAlert ? '' : 'statistics';
    this.cd.detectChanges();
  }

  onPanelClick(section: string) {
    this.expandSection = this.expandSection === section ? '' : section;
    this.activeGraph = this.expandSection === section ? section : '';
  }
}

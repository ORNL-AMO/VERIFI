import { Component, computed, effect, inject, Signal, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
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
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import { MeterStatusCheck } from 'src/app/calculations/status-check-calculations/meterStatusCheck';
import { UtilityMeterDataService } from 'src/app/shared/shared-meter-content/utility-meter-data.service';

@Component({
  selector: 'app-meter-data-table',
  templateUrl: './meter-data-table.component.html',
  styleUrl: './meter-data-table.component.css',
  standalone: false
})
export class MeterDataTableComponent {
  private utilityMeterDbService: UtilityMeterdbService = inject(UtilityMeterdbService);
  private utilityMeterDataDbService: UtilityMeterDatadbService = inject(UtilityMeterDatadbService);
  private router: Router = inject(Router);
  private loadingService: LoadingService = inject(LoadingService);
  private toastNoticationService: ToastNotificationsService = inject(ToastNotificationsService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);
  private utilityMeterDataService: UtilityMeterDataService = inject(UtilityMeterDataService);

  private facilityMeterData: Signal<Array<IdbUtilityMeterData>> = toSignal(this.utilityMeterDataDbService.facilityMeterData);
  private facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);

  selectedMeter: Signal<IdbUtilityMeter> = toSignal(this.utilityMeterDbService.selectedMeter);
  meterData: Signal<Array<IdbUtilityMeterData>> = computed(() => {
    const meterData = this.facilityMeterData();
    const selectedMeter = this.selectedMeter();
    if (!meterData || !selectedMeter) {
      return [];
    }
    return meterData.filter(d => d.meterId === selectedMeter.guid);
  });
  meterStatusCheck: Signal<MeterStatusCheck> = computed(() => {
    const facilityStatusCheck = this.facilityStatusCheck();
    const selectedMeter = this.selectedMeter();
    if (!facilityStatusCheck || !selectedMeter) {
      return null;
    }
    return facilityStatusCheck.metersStatusChecks.find(m => m.meterId === selectedMeter.guid);
  });

  meterTableType: Signal<'electricity' | 'general' | 'vehicle' | 'other'> = computed(() => {
    const selectedMeter = this.selectedMeter();
    if (!selectedMeter || selectedMeter.source === 'Electricity') {
      return 'electricity';
    } else if ([2, 5, 6].includes(selectedMeter.scope) == false) {
      return 'general';
    } else if (selectedMeter.scope == 2) {
      return 'vehicle';
    } else if ([5, 6].includes(selectedMeter.scope)) {
      return 'other';
    }
  });

  checkedItemGuids: WritableSignal<Set<string>> = signal(new Set<string>());
  hasCheckedItems: Signal<boolean> = computed(() => this.checkedItemGuids().size > 0);
  hasEstimatedReadings: Signal<boolean> = computed(() => this.meterData().some(d => d.isEstimated));
  meterDataToDelete: IdbUtilityMeterData;
  showDeleteModal: boolean = false;
  showBulkDelete: boolean = false;
  showIndividualDelete: boolean = false;
  showFilterDropdown: boolean = false;

  inDataManagement: boolean;

  private readonly selectedMeterGuid = computed(() => this.selectedMeter()?.guid);
  private readonly _resetOnMeterChange = effect(() => {
    this.selectedMeterGuid();
    this.checkedItemGuids.set(new Set<string>());
    this.utilityMeterDataService.optionSelected.set('all');
  });

  get optionSelected(): 'all' | 'estimated' {
    return this.utilityMeterDataService.optionSelected();
  }
  set optionSelected(val: 'all' | 'estimated') {
    this.utilityMeterDataService.optionSelected.set(val);
  }

  constructor() { }

  ngOnInit(): void {
    this.inDataManagement = this.router.url.includes('data-management');
  }

  uploadData() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.router.navigateByUrl('/data-management/' + selectedAccount.guid + '/import-data');
  }

  async bulkDelete() {
    this.cancelBulkDelete();
    this.loadingService.setLoadingMessage("Deleting Meter Data...");
    this.loadingService.setLoadingStatus(true);
    const checkedGuids = this.checkedItemGuids();
    const meterData = this.meterData();
    let meterDataItemsToDelete: Array<IdbUtilityMeterData> = meterData.filter(dataItem => checkedGuids.has(dataItem.guid));
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

  openBulkDelete() {
    this.sharedDataService.modalOpen.next(true);
    this.showBulkDelete = true;
  }

  cancelBulkDelete() {
    this.sharedDataService.modalOpen.next(false);
    this.showBulkDelete = false;
  }

  meterDataAdd() {
    const selectedMeter: IdbUtilityMeter = this.selectedMeter();
    this.showFilterDropdown = false;
    if (this.inDataManagement) {
      this.router.navigateByUrl('/data-management/' + selectedMeter.accountId + '/facilities/' + selectedMeter.facilityId + '/meters/' + selectedMeter.guid + '/meter-data/new-bill');
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + selectedMeter.facilityId + '/utility/energy-consumption/utility-meter/' + selectedMeter.guid + '/new-bill');
    }
  }

  setEditMeterData(meterData: IdbUtilityMeterData) {
    const selectedMeter: IdbUtilityMeter = this.selectedMeter();
    this.showFilterDropdown = false;
    if (this.inDataManagement) {
      this.router.navigateByUrl('/data-management/' + selectedMeter.accountId + '/facilities/' + selectedMeter.facilityId + '/meters/' + selectedMeter.guid + '/meter-data/edit-bill/' + meterData.guid);
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + selectedMeter.facilityId + '/utility/energy-consumption/utility-meter/' + selectedMeter.guid + '/edit-bill/' + meterData.guid);
    }
  }

  toggleFilterMenu() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  goToDataQualityReport() {
    const selectedMeter: IdbUtilityMeter = this.selectedMeter();
    this.router.navigateByUrl('/data-management/' + selectedMeter.accountId + '/facilities/' + selectedMeter.facilityId + '/meters/' + selectedMeter.guid + '/data-quality-report');
  }

  editMeter() {
    const selectedMeter: IdbUtilityMeter = this.selectedMeter();
    if (this.inDataManagement) {
      this.router.navigateByUrl('/data-management/' + selectedMeter.accountId + '/facilities/' + selectedMeter.facilityId + '/meters/' + selectedMeter.guid);
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + selectedMeter.facilityId + '/utility/energy-consumption/energy-source/edit-meter/' + selectedMeter.guid);
    }
  }

  setCheckedItemGuids(valsFromChildren: Set<string>) {
    this.checkedItemGuids.set(valsFromChildren);
  }
}

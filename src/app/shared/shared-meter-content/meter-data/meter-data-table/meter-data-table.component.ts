import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, effect, inject, Signal, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterData, IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
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
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private utilityMeterDataDbService: UtilityMeterDatadbService = inject(UtilityMeterDatadbService);
  private router: Router = inject(Router);
  private loadingService: LoadingService = inject(LoadingService);
  private toastNoticationService: ToastNotificationsService = inject(ToastNotificationsService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);
  private utilityMeterDataService: UtilityMeterDataService = inject(UtilityMeterDataService);

  private facilityMeterData: Signal<Array<IdbUtilityMeterData>> = computed(() => [...this.accountWorkspaceStore.facilityMeterData()]);
  private facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);

  selectedMeter: Signal<IdbUtilityMeter> = this.accountWorkspaceStore.selectedMeter;
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
    const meterStatusCheck = facilityStatusCheck.metersStatusChecks.find(m => m.meterId === selectedMeter.guid);
    return meterStatusCheck;
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
  showFillMissingDataModal: boolean = false;
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
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
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
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
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
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    this.loadingService.setLoadingMessage("Setting Meter Data...");
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
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

  openFillMissingDataModal() {
    if (!this.meterStatusCheck()?.missingDataMonths.length) {
      return;
    }
    this.sharedDataService.modalOpen.next(true);
    this.showFillMissingDataModal = true;
  }

  cancelFillMissingDataModal() {
    this.sharedDataService.modalOpen.next(false);
    this.showFillMissingDataModal = false;
  }

  async fillMissingDataWithZeros() {
    const selectedMeter = this.selectedMeter();
    const meterStatusCheck = this.meterStatusCheck();
    if (!selectedMeter || !meterStatusCheck?.missingDataMonths.length) {
      this.cancelFillMissingDataModal();
      return;
    }

    const currentMonthKeys = new Set(this.meterData().map(data => `${data.year}-${data.month}`));
    const missingMonths = meterStatusCheck.missingDataMonths.filter(({ month, year }) =>
      !currentMonthKeys.has(`${year}-${month}`)
    );
    if (missingMonths.length === 0) {
      this.cancelFillMissingDataModal();
      return;
    }

    this.loadingService.setLoadingMessage("Filling Missing Meter Data...");
    this.loadingService.setLoadingStatus(true);
    const selectedFacility = this.accountWorkspaceStore.selectedFacility();
    const selectedAccount = this.accountWorkspaceStore.account();
    try {
      const accountMeterData = [...this.accountWorkspaceStore.meterData()];
      for (const missingMonth of missingMonths) {
        const newMeterData = getNewIdbUtilityMeterData(selectedMeter, accountMeterData);
        delete newMeterData.id;
        newMeterData.day = 1;
        newMeterData.month = missingMonth.month;
        newMeterData.year = missingMonth.year;
        newMeterData.totalEnergyUse = 0;
        newMeterData.totalVolume = 0;
        newMeterData.totalCost = 0;
        newMeterData.isEstimated = false;
        await firstValueFrom(this.utilityMeterDataDbService.addWithObservable(newMeterData));
      }

      await this.accountWorkspaceService.reloadActiveWorkspace(true);
      this.cancelFillMissingDataModal();
      this.toastNoticationService.showToast(
        `${missingMonths.length} Missing Month${missingMonths.length === 1 ? '' : 's'} Filled!`,
        undefined,
        undefined,
        false,
        "alert-success"
      );
    } catch {
      try {
        await this.accountWorkspaceService.reloadActiveWorkspace(true);
      } catch {
        // The original save error is the useful error to report to the user.
      }
      this.toastNoticationService.showToast(
        "Unable to Fill Missing Meter Data",
        "Some missing months may not have been added. Review the list and try again.",
        undefined,
        false,
        "alert-danger"
      );
    } finally {
      this.loadingService.setLoadingStatus(false);
    }
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

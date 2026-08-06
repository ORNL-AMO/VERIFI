import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, ElementRef, inject, input, signal, Signal, ViewChild, WritableSignal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { EditMeterFormService } from '../edit-meter-form/edit-meter-form.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbUtilityMeter, IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { toSignal } from '@angular/core/rxjs-interop';
import { MeterStatusCheck } from 'src/app/calculations/status-check-calculations/meterStatusCheck';
import { AccountStatusCheckService } from '../../helper-services/account-status-check.service';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';
import * as _ from 'lodash';

type MeterTableContext = 'data-evaluation' | 'data-management';

interface MetersListItem {
  meter: IdbUtilityMeter,
  meterStatusCheck: MeterStatusCheck,
  meterDataUrl: string
}

type OrderMeterListField = 'name' | 'source' | 'fuel' | 'scope' | 'startingUnit' | 'latestReading';

@Component({
  selector: 'app-utility-meters-table',
  templateUrl: './utility-meters-table.component.html',
  styleUrls: ['./utility-meters-table.component.css'],
  standalone: false
})
export class UtilityMetersTableComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private utilityMeterdbService: UtilityMeterdbService = inject(UtilityMeterdbService);
  private copyTableService: CopyTableService = inject(CopyTableService);
  private router: Router = inject(Router);
  private loadingService: LoadingService = inject(LoadingService);
  private utilityMeterDatadbService: UtilityMeterDatadbService = inject(UtilityMeterDatadbService);
  private toastNotificationsService: ToastNotificationsService = inject(ToastNotificationsService);
  private editMeterFormService: EditMeterFormService = inject(EditMeterFormService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  context = input<MeterTableContext>('data-evaluation');

  itemsPerPage: Signal<number> = toSignal(this.sharedDataService.itemsPerPage, { initialValue: 10 });
  selectedFacility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  meters: Signal<Array<IdbUtilityMeter>> = computed(() => [...this.accountWorkspaceStore.facilityMeters()]);
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);

  metersList: Signal<Array<MetersListItem>> = computed(() => {
    const utilityMeters = this.meters();
    const facilityStatusCheck = this.facilityStatusCheck();
    const facility = this.selectedFacility();
    const ctx = this.context();
    if (!utilityMeters || !facilityStatusCheck || !facility) return [];
    const account = this.accountWorkspaceStore.account();
    return utilityMeters.map(meter => ({
      meter,
      meterStatusCheck: facilityStatusCheck.metersStatusChecks.find(mc => mc.meterId === meter.guid),
      meterDataUrl: ctx === 'data-management'
        ? `data-management/${account.guid}/facilities/${facility.guid}/meters/${meter.guid}/meter-data`
        : `/data-evaluation/facility/${facility.guid}/utility/energy-consumption/utility-meter/${meter.guid}/data-table`
    }));
  });

  orderedMetersList: Signal<Array<MetersListItem>> = computed(() => {
    const metersList = this.metersList();
    const orderBy = this.orderDataField();
    const orderDirection = this.orderByDirection();
    if (orderBy === 'latestReading') {
      return _.orderBy(metersList, [(item: MetersListItem) => {
        return item.meterStatusCheck.lastDateEntry;
      }], [orderDirection]);
    }
    return _.orderBy(metersList, [item => item.meter[orderBy]], [orderDirection]);
  });

  @ViewChild('meterTable', { static: false }) meterTable: ElementRef;

  orderDataField: WritableSignal<OrderMeterListField> = signal('name');
  meterToDelete: IdbUtilityMeter;
  orderByDirection: WritableSignal<'asc' | 'desc'> = signal('desc');
  copyingTable: boolean = false;
  currentPageNumber: number = 1;

  uploadData() {
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    this.router.navigateByUrl('/data-management/' + selectedAccount.guid + '/import-data');
  }

  async addMeter() {
    if (this.context() === 'data-management') {
      const facility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
      let newMeter: IdbUtilityMeter = getNewIdbUtilityMeter(facility.guid, facility.accountId, true, facility.energyUnit);
      newMeter = await firstValueFrom(this.utilityMeterdbService.addWithObservable(newMeter));
      await this.accountWorkspaceService.reloadActiveWorkspace(true);
      await this.selectEditMeter(newMeter);
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility().guid + '/utility/energy-consumption/energy-source/new-meter');
    }
  }

  copyTable() {
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.meterTable);
      this.copyingTable = false;
    }, 200)
  }

  selectDeleteMeter(meter: IdbUtilityMeter) {
    this.sharedDataService.modalOpen.next(true);
    this.meterToDelete = meter;
  }

  cancelDelete() {
    this.sharedDataService.modalOpen.next(false);
    this.meterToDelete = undefined;
  }

  async deleteMeter() {
    let deleteMeterId: number = this.meterToDelete.id;
    let deleteMeterGuid: string = this.meterToDelete.guid;
    this.meterToDelete = undefined;
    this.loadingService.setLoadingMessage('Deleting Meters and Data...')
    this.loadingService.setLoadingStatus(true);
    //delete meter
    await firstValueFrom(this.utilityMeterdbService.deleteIndexWithObservable(deleteMeterId));
    //delete meter data
    let meterData: Array<IdbUtilityMeterData> = this.accountWorkspaceQuery.getMeterData(deleteMeterGuid);
    for (let index = 0; index < meterData.length; index++) {
      await firstValueFrom(this.utilityMeterDatadbService.deleteWithObservable(meterData[index].id));
    }
    //set meters
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.cancelDelete();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationsService.showToast("Meter and Meter Data Deleted", undefined, undefined, false, "alert-success");
  }


  isMeterInvalid(meter: IdbUtilityMeter): boolean {
    let form: FormGroup = this.editMeterFormService.getFormFromMeter(meter);
    return form.invalid;
  }

  setOrderDataField(str: OrderMeterListField) {
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

  async selectEditMeter(meter: IdbUtilityMeter) {
    if (this.context() === 'data-management') {
      const account: IdbAccount = this.accountWorkspaceStore.account();
      const facility: IdbFacility = this.selectedFacility();
      meter.sidebarOpen = true;
      await firstValueFrom(this.utilityMeterdbService.updateWithObservable(meter));
      await this.accountWorkspaceService.reloadActiveWorkspace(true);
      this.router.navigateByUrl('data-management/' + account.guid + '/facilities/' + facility.guid + '/meters/' + meter.guid);
    } else {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility().guid + '/utility/energy-consumption/energy-source/edit-meter/' + meter.guid);
    }
  }

  navigateToMeterData(meter: IdbUtilityMeter) {
    const facility = this.selectedFacility();
    if (this.context() === 'data-management') {
      const account: IdbAccount = this.accountWorkspaceStore.account();
      this.router.navigateByUrl(`data-management/${account.guid}/facilities/${facility.guid}/meters/${meter.guid}/meter-data`);
    } else {
      this.router.navigateByUrl(`/data-evaluation/facility/${facility.guid}/utility/energy-consumption/utility-meter/${meter.guid}/data-table`);
    }
  }

  getSortIcon(field: OrderMeterListField): string {
    if (this.orderDataField() !== field) return 'fa-sort text-muted';
    return this.orderByDirection() === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  async createCopy(meter: IdbUtilityMeter) {
    let copyMeter: IdbUtilityMeter = JSON.parse(JSON.stringify(meter));
    delete copyMeter.id;
    copyMeter.guid = Math.random().toString(36).substr(2, 9);
    copyMeter.name = copyMeter.name + ' (copy)';
    copyMeter = await firstValueFrom(this.utilityMeterdbService.addWithObservable(copyMeter));
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.selectEditMeter(copyMeter);
  }
}

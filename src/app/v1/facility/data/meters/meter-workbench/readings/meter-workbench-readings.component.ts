import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { deleteWorkspaceRecords, upsertWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterCommandHandler } from '@data/account-workspace/handlers/meter-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IdbUtilityMeterData, getNewIdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { MeterStatusCheck } from '@domain/calculations/status-check-calculations/meterStatusCheck';
import { getDateFromMeterData, setMeterDataDateFromDate } from '@shared/dateHelperFunctions';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { ElectronService } from '@platform/electron/electron.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { FacilityMetersWorkspaceService } from '@app/v1/facility/data/meters/facility-meters-workspace.service';
import { meterWorkbenchTab } from '@app/v1/facility/data/meters/facility-meters.models';
import { MeterReadingBillSave } from './meter-reading-bill-slideout/meter-reading-bill-slideout.component';
import { MeterReadingsTableService } from './meter-readings-table.service';
import { MeterReadingColumnDraft } from './meter-workbench-readings.models';

interface BillPanelState {
  readonly mode: 'add' | 'edit';
  readonly reading: IdbUtilityMeterData;
}

@Component({
  selector: 'app-meter-workbench-readings',
  templateUrl: './meter-workbench-readings.component.html',
  styleUrls: ['./meter-workbench-readings.component.css'],
  standalone: false
})
export class MeterWorkbenchReadingsComponent implements OnDestroy {
  private readonly accountWorkspace = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly meterHandler = inject(MeterCommandHandler);
  private readonly tableService = inject(MeterReadingsTableService);
  private readonly toastNotifications = inject(ToastNotificationsService);
  private readonly electronService = inject(ElectronService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private confirmModalOpen = false;

  readonly tab = meterWorkbenchTab('readings');
  readonly workspace = inject(FacilityMetersWorkspaceService);
  readonly account = this.workspace.account;
  readonly facility = this.workspace.facility;
  readonly meter = this.workspace.selectedMeter;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly selectedMeterData = this.workspace.selectedMeterData;
  readonly customFuels = this.accountWorkspace.customFuels;
  readonly customGWPs = this.accountWorkspace.customGWPs;
  readonly columnsOpen = signal(false);
  readonly billPanel = signal<BillPanelState | undefined>(undefined);
  readonly deleteTarget = signal<IdbUtilityMeterData | undefined>(undefined);
  readonly bulkDeleteReadings = signal<readonly IdbUtilityMeterData[]>([]);
  readonly bulkDeleteOpen = signal(false);
  readonly fillMissingOpen = signal(false);
  readonly saving = signal(false);
  readonly actionError = signal<string | undefined>(undefined);
  readonly isElectron = this.electronService.isElectron;
  readonly canAct = computed(() => this.canWrite() && !this.hasPending() && !this.saving());
  readonly selectedMeterStatusCheck = computed<MeterStatusCheck | undefined>(() => {
    const meter = this.meter();
    return meter ? this.workspace.meterStatusChecks().find(status => status.meterId === meter.guid) : undefined;
  });
  readonly tableView = computed(() => this.tableService.buildTableView({
    account: this.account(),
    facility: this.facility(),
    meter: this.meter(),
    readings: this.selectedMeterData(),
    customFuels: this.customFuels(),
    customGWPs: this.customGWPs()
  }));
  readonly selectedCount = computed(() => this.bulkDeleteReadings().length);
  readonly missingDataMonths = computed(() => this.selectedMeterStatusCheck()?.missingDataMonths ?? []);

  private readonly selectedMeterGuid = computed(() => this.meter()?.guid);
  private readonly resetOnMeterChange = effect(() => {
    this.selectedMeterGuid();
    this.columnsOpen.set(false);
    this.billPanel.set(undefined);
    this.bulkDeleteReadings.set([]);
    this.bulkDeleteOpen.set(false);
    this.hideConfirmModal();
  });

  @ViewChild('readingsConfirmModal') private readonly readingsConfirmModal?: TemplateRef<unknown>;

  ngOnDestroy(): void {
    this.hideConfirmModal();
  }

  openColumns(): void {
    if (this.canAct()) {
      this.columnsOpen.set(true);
      this.actionError.set(undefined);
    }
  }

  closeColumns(): void {
    if (!this.saving()) {
      this.columnsOpen.set(false);
    }
  }

  openAddBill(): void {
    const meter = this.meter();
    if (!meter || !this.canAct()) {
      return;
    }
    this.billPanel.set({
      mode: 'add',
      reading: getNewIdbUtilityMeterData(meter, [...this.accountWorkspace.meterData()])
    });
    this.actionError.set(undefined);
  }

  openEditBill(reading: IdbUtilityMeterData): void {
    if (this.canAct()) {
      this.billPanel.set({ mode: 'edit', reading: structuredClone(reading) });
      this.actionError.set(undefined);
    }
  }

  closeBillPanel(): void {
    if (!this.saving()) {
      this.billPanel.set(undefined);
    }
  }

  requestDelete(reading: IdbUtilityMeterData): void {
    if (this.canAct()) {
      this.deleteTarget.set(reading);
      this.showConfirmModal();
    }
  }

  cancelDelete(): void {
    if (!this.saving()) {
      this.deleteTarget.set(undefined);
      this.bulkDeleteOpen.set(false);
      this.bulkDeleteReadings.set([]);
      this.fillMissingOpen.set(false);
      this.hideConfirmModal();
    }
  }

  requestBulkDelete(readings: readonly IdbUtilityMeterData[]): void {
    if (this.canAct() && readings.length > 0) {
      this.bulkDeleteReadings.set(readings);
      this.bulkDeleteOpen.set(true);
      this.showConfirmModal();
    }
  }

  requestFillMissing(): void {
    if (this.canAct() && this.missingDataMonths().length > 0) {
      this.fillMissingOpen.set(true);
      this.showConfirmModal();
    }
  }

  async applyColumns(draft: MeterReadingColumnDraft): Promise<void> {
    const account = this.account();
    const facility = this.facility();
    const meter = this.meter();
    if (!account || !facility || !meter) {
      return;
    }
    const updatedFacility = {
      ...structuredClone(facility),
      tableElectricityFilters: draft.electricityFilters,
      tableGeneralUtilityFilters: draft.generalFilters,
      tableVehicleDataFilters: draft.vehicleFilters
    };
    const updatedMeter = {
      ...structuredClone(meter),
      charges: draft.charges ?? []
    };
    await this.runAction('Column choices could not be saved.', async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'meter',
          changeKind: 'update',
          entityGuid: updatedMeter.guid,
          label: 'Saving reading columns',
          publication: { mode: 'reload' }
        },
        () => this.meterHandler.updateMeterWithFacility(updatedMeter, updatedFacility, account.guid)
      );
      this.columnsOpen.set(false);
      this.toastNotifications.showToast('Columns Updated', undefined, undefined, false, 'alert-success');
    });
  }

  async saveBill(save: MeterReadingBillSave): Promise<void> {
    const account = this.account();
    const meter = this.meter();
    const panel = this.billPanel();
    if (!account || !meter || !panel) {
      return;
    }
    if (this.hasDuplicateReadingDate(save.reading)) {
      this.actionError.set('A reading already exists for this date.');
      this.toastNotifications.showToast('Meter Reading Update Failed', 'A reading already exists for this date.', undefined, false, 'alert-danger');
      return;
    }
    await this.runAction('Reading could not be saved.', async () => {
      if (panel.mode === 'edit') {
        await this.commandBoundary.execute(
          {
            entityKind: 'meterData',
            changeKind: 'update',
            entityGuid: save.reading.guid,
            label: 'Save Reading',
            publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('meterData', [value]) }
          },
          () => this.meterHandler.updateMeterData(save.reading, account.guid)
        );
        this.billPanel.set(undefined);
      } else {
        const readingToSave = structuredClone(save.reading);
        delete readingToSave.id;
        const result = await this.commandBoundary.execute(
          {
            entityKind: 'meterData',
            changeKind: 'add',
            entityGuid: readingToSave.guid,
            label: 'Add Reading',
            publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('meterData', [value]) }
          },
          () => this.meterHandler.addMeterData(readingToSave, account.guid)
        );
        if (save.addAnother) {
          const nextReading = getNewIdbUtilityMeterData(meter, [...this.accountWorkspace.meterData(), result.value]);
          const nextDate = getDateFromMeterData(result.value);
          nextDate.setMonth(nextDate.getMonth() + 1);
          this.billPanel.set({ mode: 'add', reading: setMeterDataDateFromDate(nextReading, nextDate) });
        } else {
          this.billPanel.set(undefined);
        }
      }
      this.toastNotifications.showToast('Reading Saved', undefined, undefined, false, 'alert-success');
    });
  }

  async confirmDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (target?.id === undefined) {
      return;
    }
    await this.runAction('Reading could not be deleted.', async () => {
      const idToDelete = target.id as number;
      await this.commandBoundary.execute(
        {
          entityKind: 'meterData',
          changeKind: 'delete',
          entityGuid: target.guid,
          label: 'Delete Meter Data',
          publication: { mode: 'patch', buildPatch: () => deleteWorkspaceRecords('meterData', { ids: [idToDelete] }) }
        },
        () => this.meterHandler.deleteMeterData(idToDelete)
      );
      this.deleteTarget.set(undefined);
      this.hideConfirmModal();
      this.toastNotifications.showToast('Meter Data Deleted', undefined, undefined, false, 'alert-success');
    });
  }

  async confirmBulkDelete(): Promise<void> {
    const readings = this.bulkDeleteReadings().filter(reading => reading.id !== undefined);
    if (readings.length === 0) {
      return;
    }
    await this.runAction('Selected readings could not be deleted.', async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'meterData',
          changeKind: 'bulk',
          label: 'Delete Meter Data',
          publication: { mode: 'patch', buildPatch: () => deleteWorkspaceRecords('meterData', { ids: readings.map(reading => reading.id as number) }) }
        },
        async () => {
          for (const reading of readings) {
            await this.meterHandler.deleteMeterData(reading.id as number);
          }
        }
      );
      this.bulkDeleteOpen.set(false);
      this.bulkDeleteReadings.set([]);
      this.hideConfirmModal();
      this.toastNotifications.showToast('Meter Data Deleted', undefined, undefined, false, 'alert-success');
    });
  }

  async confirmFillMissing(): Promise<void> {
    const account = this.account();
    const meter = this.meter();
    if (!account || !meter) {
      return;
    }
    const currentMonthKeys = new Set(this.selectedMeterData().map(reading => `${reading.year}-${reading.month}`));
    const missingMonths = this.missingDataMonths().filter(({ month, year }) => !currentMonthKeys.has(`${year}-${month}`));
    if (missingMonths.length === 0) {
      this.fillMissingOpen.set(false);
      this.hideConfirmModal();
      return;
    }
    await this.runAction('Missing months could not be filled.', async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'meterData',
          changeKind: 'bulk',
          label: 'Fill Missing Meter Data',
          publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('meterData', value) }
        },
        async () => {
          const addedReadings: IdbUtilityMeterData[] = [];
          for (const missingMonth of missingMonths) {
            const reading = getNewIdbUtilityMeterData(meter, [...this.accountWorkspace.meterData(), ...addedReadings]);
            delete reading.id;
            reading.day = 1;
            reading.month = missingMonth.month;
            reading.year = missingMonth.year;
            reading.totalEnergyUse = 0;
            reading.totalVolume = 0;
            reading.totalCost = 0;
            reading.isEstimated = false;
            addedReadings.push(await this.meterHandler.addMeterData(reading, account.guid));
          }
          return addedReadings;
        }
      );
      this.fillMissingOpen.set(false);
      this.hideConfirmModal();
      this.toastNotifications.showToast(`${missingMonths.length} Missing Month${missingMonths.length === 1 ? '' : 's'} Filled`, undefined, undefined, false, 'alert-success');
    });
  }

  openSettings(): void {
    this.openTab('settings', 'meter-reading-settings');
  }

  openQuality(): void {
    this.openTab('quality');
  }

  openConnectedBill(reading: IdbUtilityMeterData): void {
    if (!this.isElectron || !reading.uploadedFilePath) {
      return;
    }
    this.electronService.checkKeyExists(reading.guid);
    this.electronService.savedUtilityFilePath[reading.guid].next(reading.uploadedFilePath);
    this.electronService.openFileLocation(reading.guid);
  }

  private openTab(tab: 'settings' | 'quality', fragment?: string): void {
    const facility = this.facility();
    const meter = this.meter();
    if (facility && meter) {
      void this.router.navigate(this.navigation.facilityMeterRoute(facility.guid, meter.guid, tab), fragment ? { fragment } : undefined);
    }
  }

  private async runAction(errorMessage: string, action: () => Promise<void>): Promise<void> {
    if (!this.canAct()) {
      return;
    }
    this.saving.set(true);
    this.actionError.set(undefined);
    try {
      await action();
    } catch (error) {
      this.actionError.set(error instanceof Error ? error.message : errorMessage);
      this.toastNotifications.showToast('Meter Reading Update Failed', errorMessage, undefined, false, 'alert-danger');
    } finally {
      this.saving.set(false);
    }
  }

  private hasDuplicateReadingDate(reading: IdbUtilityMeterData): boolean {
    const meter = this.meter();
    if (!meter) {
      return false;
    }
    return this.selectedMeterData().some(existingReading => {
      return existingReading.meterId === meter.guid
        && existingReading.guid !== reading.guid
        && existingReading.year === reading.year
        && existingReading.month === reading.month
        && existingReading.day === reading.day;
    });
  }

  private showConfirmModal(): void {
    if (!this.readingsConfirmModal) {
      return;
    }
    this.confirmModalOpen = true;
    this.modalPortal.show(new TemplatePortal(this.readingsConfirmModal, this.viewContainerRef));
  }

  private hideConfirmModal(): void {
    if (this.confirmModalOpen) {
      this.confirmModalOpen = false;
      this.modalPortal.hide();
    }
  }
}

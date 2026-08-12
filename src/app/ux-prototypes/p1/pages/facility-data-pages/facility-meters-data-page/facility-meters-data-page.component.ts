import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MeterCommandHandler } from 'src/app/account-workspace/handlers/meter-command-handler.service';
import { MeterGroupCommandHandler } from 'src/app/account-workspace/handlers/meter-group-command-handler.service';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { upsertWorkspaceRecords, deleteWorkspaceRecords } from 'src/app/account-workspace/account-workspace-patches';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { MeterStatusCheck } from 'src/app/calculations/status-check-calculations/meterStatusCheck';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { getNewIdbUtilityMeter, IdbUtilityMeter, MeterReadingDataApplication } from 'src/app/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterData, IdbUtilityMeterData, updateMeterDataCharges } from 'src/app/models/idbModels/utilityMeterData';
import { getNewIdbUtilityMeterGroup, IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { getGUID, getIsEnergyMeter } from 'src/app/shared/sharedHelperFunctions';
import {
  buildP1MeterRows,
  countP1MeterIssues,
  P1BillEditorMode,
  P1MeterGroupView,
  P1MetersHomeView,
  P1MeterWorkbenchTab
} from './facility-meters-workbench.helpers';

@Component({
  selector: 'app-p1-facility-meters-data-page',
  templateUrl: './facility-meters-data-page.component.html',
  styleUrls: ['./facility-meters-data-page.component.css'],
  standalone: false
})
export class P1FacilityMetersDataPageComponent {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly workspaceService = inject(AccountWorkspaceService);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly meterHandler = inject(MeterCommandHandler);
  private readonly meterGroupHandler = inject(MeterGroupCommandHandler);
  private readonly statusCheckService = inject(AccountStatusCheckService);
  private readonly toast = inject(ToastNotificationsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParamMap = toSignal(this.route.queryParamMap);

  readonly account = this.workspace.account;
  readonly facility = this.workspace.selectedFacility;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly meters = computed(() => [...this.workspace.facilityMeters()]);
  readonly meterData = computed(() => [...this.workspace.facilityMeterData()]);
  readonly meterGroups = computed(() => [...this.workspace.facilityMeterGroups()]);
  readonly facilityStatusCheck = toSignal(this.statusCheckService.selectedFacilityStatusCheck$);
  readonly meterStatuses = computed(() => this.facilityStatusCheck()?.metersStatusChecks ?? []);
  readonly meterRows = computed(() => buildP1MeterRows(
    this.meters(),
    this.meterData(),
    this.meterGroups(),
    this.meterStatuses()
  ));
  readonly issueCount = computed(() => countP1MeterIssues(this.meterStatuses()));
  readonly selectedMeterGuid = computed(() => this.queryParamMap()?.get('meter') || undefined);
  readonly homeView = computed<P1MetersHomeView>(() => {
    return this.queryParamMap()?.get('view') === 'analysis-groups' ? 'analysis-groups' : 'meters';
  });
  readonly activeTab = signal<P1MeterWorkbenchTab>('setup');
  readonly billEditor = signal<{ mode: P1BillEditorMode; data?: IdbUtilityMeterData } | undefined>(undefined);
  readonly groupEditor = signal<{ view: P1MeterGroupView; group?: IdbUtilityMeterGroup } | undefined>(undefined);
  readonly meterToDelete = signal<IdbUtilityMeter | undefined>(undefined);
  readonly billToDelete = signal<IdbUtilityMeterData | undefined>(undefined);
  readonly bulkBillDeleteGuids = signal<Set<string> | undefined>(undefined);
  readonly groupToDelete = signal<IdbUtilityMeterGroup | undefined>(undefined);

  readonly selectedMeter = computed(() => {
    const selectedGuid = this.selectedMeterGuid();
    const meters = this.meters();
    return selectedGuid ? meters.find(meter => meter.guid === selectedGuid) : undefined;
  });

  readonly selectedMeterData = computed(() => {
    const meter = this.selectedMeter();
    return meter ? this.meterData().filter(data => data.meterId === meter.guid) : [];
  });

  readonly selectedMeterStatus = computed<MeterStatusCheck | undefined>(() => {
    const meter = this.selectedMeter();
    return meter ? this.meterStatuses().find(status => status.meterId === meter.guid) : undefined;
  });
  readonly selectedMeterGroup = computed<IdbUtilityMeterGroup | undefined>(() => {
    const meter = this.selectedMeter();
    return meter ? this.meterGroups().find(group => group.guid === meter.groupId) : undefined;
  });
  readonly calanderizedMeters = computed<CalanderizedMeter[]>(() => {
    const account = this.account();
    const facility = this.facility();
    if (!account || !facility) {
      return [];
    }
    return getCalanderizedMeterData(
      this.meters(),
      this.meterData(),
      facility,
      false,
      { energyIsSource: facility.energyIsSource, neededUnits: undefined },
      this.workspace.customEmissions().map(item => ({ ...item, isCustom: true })),
      [...this.workspace.customFuels()],
      [...this.workspace.facilities()],
      account.assessmentReportVersion,
      [...this.workspace.customGWPs()]
    );
  });
  readonly selectedCalanderizedMeter = computed<CalanderizedMeter | undefined>(() => {
    const meter = this.selectedMeter();
    return meter ? this.calanderizedMeters().find(data => data.meter.guid === meter.guid) : undefined;
  });

  constructor() {
    effect(() => {
      const meter = this.selectedMeter();
      untracked(() => this.workspaceService.selectMeter(meter?.guid));
    });
  }

  selectMeter(meter: IdbUtilityMeter): void {
    this.billEditor.set(undefined);
    this.groupEditor.set(undefined);
    this.workspaceService.selectMeter(meter.guid);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { meter: meter.guid, view: null },
      queryParamsHandling: 'merge'
    });
  }

  clearMeterSelection(): void {
    this.billEditor.set(undefined);
    this.groupEditor.set(undefined);
    this.workspaceService.selectMeter(undefined);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { meter: null },
      queryParamsHandling: 'merge'
    });
  }

  setHomeView(view: P1MetersHomeView): void {
    this.billEditor.set(undefined);
    if (view === 'meters') {
      this.groupEditor.set(undefined);
    } else if (!this.groupEditor()) {
      this.groupEditor.set({ view: 'manage' });
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: view === 'analysis-groups' ? 'analysis-groups' : null, meter: null },
      queryParamsHandling: 'merge'
    });
  }

  openAnalysisGroupsHome(): void {
    this.setHomeView('analysis-groups');
  }

  setTab(tab: P1MeterWorkbenchTab): void {
    this.activeTab.set(tab);
    this.billEditor.set(undefined);
  }

  async addMeter(): Promise<void> {
    const account = this.account();
    const facility = this.facility();
    if (!account || !facility || !this.canWrite()) {
      return;
    }
    const newMeter = getNewIdbUtilityMeter(facility.guid, account.guid, true, facility.energyUnit);
    const result = await this.commandBoundary.execute(
      {
        entityKind: 'meter',
        changeKind: 'add',
        label: 'Add Meter',
        publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('meters', [value]) }
      },
      () => this.meterHandler.addMeter(newMeter, account.guid)
    );
    this.selectMeter(result.value);
    this.activeTab.set('setup');
    this.toast.showToast('Meter Added', undefined, undefined, false, 'alert-success');
  }

  async copyMeter(meter: IdbUtilityMeter): Promise<void> {
    const account = this.account();
    if (!account || !this.canWrite()) {
      return;
    }
    const copy = structuredClone(meter);
    delete copy.id;
    copy.guid = getGUID();
    copy.name = `${copy.name} (copy)`;
    copy.charges = copy.charges?.map(charge => ({ ...charge, guid: getGUID() })) ?? [];
    const result = await this.commandBoundary.execute(
      {
        entityKind: 'meter',
        changeKind: 'add',
        label: 'Copy Meter',
        publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('meters', [value]) }
      },
      () => this.meterHandler.addMeter(copy, account.guid)
    );
    this.selectMeter(result.value);
    this.activeTab.set('setup');
    this.toast.showToast('Meter Copied', undefined, undefined, false, 'alert-success');
  }

  async saveMeter(meter: IdbUtilityMeter): Promise<void> {
    const account = this.account();
    if (!account || !this.canWrite()) {
      return;
    }
    const meterDataUpdates = updateMeterDataCharges(meter, structuredClone(this.selectedMeterData()));
    await this.commandBoundary.execute(
      {
        entityKind: 'meter',
        changeKind: 'update',
        entityGuid: meter.guid,
        label: 'Save Meter',
        publication: { mode: 'reload' }
      },
      () => this.meterHandler.updateMeterWithData(meter, meterDataUpdates, account.guid)
    );
    this.toast.showToast('Meter Saved', undefined, undefined, false, 'alert-success');
  }

  async saveCalendarizationMethod(method: MeterReadingDataApplication): Promise<void> {
    const account = this.account();
    const meter = this.selectedMeter();
    if (!account || !meter || !this.canWrite()) {
      return;
    }
    const updatedMeter: IdbUtilityMeter = {
      ...structuredClone(meter),
      meterReadingDataApplication: method
    };
    await this.commandBoundary.execute(
      {
        entityKind: 'meter',
        changeKind: 'update',
        entityGuid: updatedMeter.guid,
        label: 'Update Calendarization Method',
        publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('meters', [value]) }
      },
      () => this.meterHandler.updateMeter(updatedMeter, account.guid)
    );
    this.toast.showToast('Calendarization Method Saved', undefined, undefined, false, 'alert-success');
  }

  async saveMeterGroupAssignment(groupId: string | undefined): Promise<void> {
    const account = this.account();
    const meter = this.selectedMeter();
    if (!account || !meter || !this.canWrite() || meter.groupId === groupId) {
      return;
    }
    const updatedMeter: IdbUtilityMeter = {
      ...structuredClone(meter),
      groupId
    };
    await this.commandBoundary.execute(
      {
        entityKind: 'meter',
        changeKind: 'update',
        entityGuid: updatedMeter.guid,
        label: 'Update Meter Analysis Group',
        publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('meters', [value]) }
      },
      () => this.meterHandler.updateMeter(updatedMeter, account.guid)
    );
    this.toast.showToast('Analysis Group Assignment Saved', undefined, undefined, false, 'alert-success');
  }

  requestDeleteMeter(meter: IdbUtilityMeter): void {
    this.meterToDelete.set(meter);
  }

  async deleteMeter(): Promise<void> {
    const meter = this.meterToDelete();
    const account = this.account();
    if (!meter || !account || !this.canWrite()) {
      return;
    }
    const meterData = this.meterData().filter(data => data.meterId === meter.guid);
    await this.commandBoundary.execute(
      { entityKind: 'meter', changeKind: 'delete', entityGuid: meter.guid, label: 'Delete Meter and Data' },
      async () => {
        await this.meterHandler.deleteMeter(meter, account.guid);
        for (const data of meterData) {
          await this.meterHandler.deleteMeterData(data.id);
        }
      }
    );
    this.meterToDelete.set(undefined);
    this.clearMeterSelection();
    this.toast.showToast('Meter and Readings Deleted', undefined, undefined, false, 'alert-success');
  }

  openBillEditor(mode: P1BillEditorMode, data?: IdbUtilityMeterData): void {
    this.billEditor.set({ mode, data });
  }

  closeBillEditor(): void {
    this.billEditor.set(undefined);
  }

  async saveBill(event: { data: IdbUtilityMeterData; addAnother: boolean }): Promise<void> {
    const account = this.account();
    const meter = this.selectedMeter();
    const editor = this.billEditor();
    if (!account || !meter || !editor || !this.canWrite()) {
      return;
    }
    if (editor.mode === 'edit') {
      await this.commandBoundary.execute(
        {
          entityKind: 'meterData',
          changeKind: 'update',
          entityGuid: event.data.guid,
          label: 'Save Reading',
          publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('meterData', [value]) }
        },
        () => this.meterHandler.updateMeterData(event.data, account.guid)
      );
      this.closeBillEditor();
    } else {
      delete event.data.id;
      const result = await this.commandBoundary.execute(
        {
          entityKind: 'meterData',
          changeKind: 'add',
          entityGuid: event.data.guid,
          label: 'Add Reading',
          publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('meterData', [value]) }
        },
        () => this.meterHandler.addMeterData(event.data, account.guid)
      );
      if (event.addAnother) {
        const next = getNewIdbUtilityMeterData(meter, [...this.meterData(), result.value]);
        this.billEditor.set({ mode: 'add', data: next });
      } else {
        this.closeBillEditor();
      }
    }
    this.toast.showToast('Reading Saved', undefined, undefined, false, 'alert-success');
  }

  requestDeleteBill(data: IdbUtilityMeterData): void {
    this.billToDelete.set(data);
  }

  requestBulkDeleteBills(guids: Set<string>): void {
    this.bulkBillDeleteGuids.set(new Set(guids));
  }

  async deleteBill(): Promise<void> {
    const data = this.billToDelete();
    if (!data || !this.canWrite()) {
      return;
    }
    await this.commandBoundary.execute(
      {
        entityKind: 'meterData',
        changeKind: 'delete',
        entityGuid: data.guid,
        label: 'Delete Reading',
        publication: { mode: 'patch', buildPatch: () => deleteWorkspaceRecords('meterData', { ids: [data.id] }) }
      },
      () => this.meterHandler.deleteMeterData(data.id)
    );
    this.billToDelete.set(undefined);
    this.toast.showToast('Reading Deleted', undefined, undefined, false, 'alert-success');
  }

  async bulkDeleteBills(): Promise<void> {
    const selectedGuids = this.bulkBillDeleteGuids();
    if (!selectedGuids?.size || !this.canWrite()) {
      return;
    }
    const readings = this.selectedMeterData().filter(data => selectedGuids.has(data.guid));
    await this.commandBoundary.execute(
      {
        entityKind: 'meterData',
        changeKind: 'bulk',
        label: 'Delete Readings',
        publication: { mode: 'patch', buildPatch: () => deleteWorkspaceRecords('meterData', { ids: readings.map(data => data.id) }) }
      },
      async () => {
        for (const data of readings) {
          await this.meterHandler.deleteMeterData(data.id);
        }
      }
    );
    this.bulkBillDeleteGuids.set(undefined);
    this.toast.showToast('Readings Deleted', undefined, undefined, false, 'alert-success');
  }

  async fillMissingMonths(): Promise<void> {
    const meter = this.selectedMeter();
    const status = this.selectedMeterStatus();
    const account = this.account();
    if (!meter || !status?.missingDataMonths.length || !account || !this.canWrite()) {
      return;
    }
    const existingKeys = new Set(this.selectedMeterData().map(data => `${data.year}-${data.month}`));
    const missingMonths = status.missingDataMonths.filter(item => !existingKeys.has(`${item.year}-${item.month}`));
    if (!missingMonths.length) {
      return;
    }
    await this.commandBoundary.execute(
      {
        entityKind: 'meterData',
        changeKind: 'bulk',
        label: 'Fill Missing Meter Data',
        publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('meterData', value) }
      },
      async () => {
        const added: IdbUtilityMeterData[] = [];
        for (const missingMonth of missingMonths) {
          const newData = getNewIdbUtilityMeterData(meter, this.meterData());
          delete newData.id;
          newData.day = 1;
          newData.month = missingMonth.month;
          newData.year = missingMonth.year;
          newData.totalEnergyUse = 0;
          newData.totalVolume = 0;
          newData.totalCost = 0;
          newData.isEstimated = false;
          added.push(await this.meterHandler.addMeterData(newData, account.guid));
        }
        return added;
      }
    );
    this.toast.showToast('Missing Months Filled', undefined, undefined, false, 'alert-success');
  }

  addGroup(): void {
    const account = this.account();
    const facility = this.facility();
    if (!account || !facility || !this.canWrite()) {
      return;
    }
    const meters = this.meters();
    const groupType = meters.some(meter => getIsEnergyMeter(meter.source))
      ? 'Energy'
      : meters.some(meter => meter.source === 'Water Intake' || meter.source === 'Water Discharge')
        ? 'Water'
        : 'Other';
    const group = getNewIdbUtilityMeterGroup(groupType, 'New Group', facility.guid, account.guid);
    this.groupEditor.set({ view: 'edit', group });
    this.setHomeView('analysis-groups');
  }

  openGroupView(event: { view: P1MeterGroupView; group?: IdbUtilityMeterGroup }): void {
    this.groupEditor.set(event);
  }

  async saveGroup(event: {
    group: IdbUtilityMeterGroup;
    oldGroupType: 'Energy' | 'Water' | 'Other';
    metersToAdd: IdbUtilityMeter[];
    metersToRemove: IdbUtilityMeter[];
  }): Promise<void> {
    const account = this.account();
    if (!account || !this.canWrite()) {
      return;
    }
    const isNewGroup = event.group.id === undefined;
    await this.commandBoundary.execute(
      {
        entityKind: 'meterGroup',
        changeKind: isNewGroup ? 'add' : 'update',
        entityGuid: event.group.guid,
        label: isNewGroup ? 'Add Analysis Group' : 'Save Analysis Group'
      },
      async () => {
        if (isNewGroup) {
          const added = await this.meterHandler.addMeterGroup(event.group, account.guid);
          await this.meterGroupHandler.addGroup(added);
          for (const meter of event.metersToAdd) {
            await this.meterHandler.updateMeter({ ...structuredClone(meter), groupId: added.guid }, account.guid);
          }
          return added;
        }
        return this.meterGroupHandler.saveMeterGroup(
          event.group,
          event.group.groupType !== event.oldGroupType,
          event.oldGroupType,
          event.metersToAdd,
          event.metersToRemove,
          account.guid
        );
      }
    );
    this.groupEditor.set({ view: 'manage' });
    this.toast.showToast(isNewGroup ? 'Analysis Group Added' : 'Analysis Group Saved', undefined, undefined, false, 'alert-success');
  }

  requestDeleteGroup(group: IdbUtilityMeterGroup): void {
    this.groupToDelete.set(group);
  }

  async deleteGroup(): Promise<void> {
    const group = this.groupToDelete();
    const account = this.account();
    if (!group || !account || !this.canWrite()) {
      return;
    }
    const groupMeters = this.meters()
      .filter(meter => meter.groupId === group.guid)
      .map(meter => ({ ...structuredClone(meter), groupId: undefined }));
    await this.commandBoundary.execute(
      { entityKind: 'meterGroup', changeKind: 'delete', entityGuid: group.guid, label: 'Delete Analysis Group' },
      async () => {
        await this.meterHandler.deleteMeterGroup(group.id);
        for (const meter of groupMeters) {
          await this.meterHandler.updateMeter(meter, account.guid);
        }
        await this.meterGroupHandler.deleteGroup(group);
      }
    );
    this.groupToDelete.set(undefined);
    this.groupEditor.set({ view: 'manage' });
    this.toast.showToast('Analysis Group Deleted', undefined, undefined, false, 'alert-success');
  }

  uploadData(): void {
    const account = this.account();
    if (account) {
      void this.router.navigateByUrl(`/data-management/${account.guid}/import-data`);
    }
  }
}

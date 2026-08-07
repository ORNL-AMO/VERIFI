import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { MeterCommandHandler } from 'src/app/account-workspace/handlers/meter-command-handler.service';
import { MeterGroupCommandHandler } from 'src/app/account-workspace/handlers/meter-group-command-handler.service';
import { Component, inject, computed, Injector } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterGroup, IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-manage-meter-grouping',
  standalone: false,
  templateUrl: './manage-meter-grouping.component.html',
  styleUrl: './manage-meter-grouping.component.css',
})
export class ManageMeterGroupingComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  facilityMeters: Array<IdbUtilityMeter>;
  facilityMetersSub: Subscription;

  facility: IdbFacility;
  facilitySub: Subscription;

  facilityMeterGroupsSub: Subscription;
  energyGroups: Array<IdbUtilityMeterGroup>;
  waterGroups: Array<IdbUtilityMeterGroup>;
  otherGroups: Array<IdbUtilityMeterGroup>;

  hasEnergyMeters: boolean;
  hasWaterMeters: boolean;

  ungroupedMeters: Array<IdbUtilityMeter>;
  groupToDelete: IdbUtilityMeterGroup;
  ungroupedMeterGroup: IdbUtilityMeterGroup;
  constructor(
    private commandBoundary: WorkspaceCommandBoundary,
    private meterHandler: MeterCommandHandler,
    private meterGroupHandler: MeterGroupCommandHandler,
    private router: Router,
    private loadingService: LoadingService,
    private toastNoticationService: ToastNotificationsService,
    private activatedRoute: ActivatedRoute,
    private injector: Injector
  ) {
  }


  ngOnInit() {
    this.facilityMetersSub = toObservable(computed(() => [...this.accountWorkspaceStore.facilityMeters()]), { injector: this.injector }).subscribe(meters => {
      this.facilityMeters = meters;
      this.hasEnergyMeters = this.facilityMeters.find(meter => { return meter.includeInEnergy }) != undefined;
      this.hasWaterMeters = this.facilityMeters.find(meter => { return meter.source == 'Water Discharge' || meter.source == 'Water Intake' }) != undefined;
      this.ungroupedMeters = this.facilityMeters.filter(meter => { return meter.groupId == undefined })
    });
    this.facilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(facility => {
      this.facility = facility;
      this.ungroupedMeterGroup = getNewIdbUtilityMeterGroup('Other', "Ungrouped Meters", facility.guid, facility.accountId);
      this.ungroupedMeterGroup.guid = undefined;
    });
    this.facilityMeterGroupsSub = toObservable(computed(() => [...this.accountWorkspaceStore.facilityMeterGroups()]), { injector: this.injector }).subscribe(facilityMeterGroups => {
      this.otherGroups = facilityMeterGroups.filter(group => { return group.groupType == 'Other' });
      this.waterGroups = facilityMeterGroups.filter(group => { return group.groupType == 'Water' });
      this.energyGroups = facilityMeterGroups.filter(group => { return group.groupType == 'Energy' });
    });
  }

  ngOnDestroy() {
    this.facilityMetersSub.unsubscribe();
    this.facilitySub.unsubscribe();
    this.facilityMeterGroupsSub.unsubscribe();
  }

  uploadData() {
    this.router.navigateByUrl('/data-management/' + this.facility.accountId + '/import-data');
  }

  async addGroup() {
    let newGroupType: 'Energy' | 'Water' | 'Other' = this.hasEnergyMeters ? 'Energy' : this.hasWaterMeters ? 'Water' : 'Other';
    let newGroup: IdbUtilityMeterGroup = getNewIdbUtilityMeterGroup(newGroupType, "New Group", this.facility.guid, this.facility.accountId);
    const result = await this.commandBoundary.execute(
      { entityKind: 'meterGroup', changeKind: 'add', label: 'Add Meter Group' },
      async () => {
        const added = await this.meterHandler.addMeterGroup(newGroup, this.accountWorkspaceStore.account()?.guid);
        await this.meterGroupHandler.addGroup(added);
        return added;
      }
    );
    this.toastNoticationService.showToast("Meter Group Added!", undefined, undefined, false, "alert-success");
    this.editGroup(result.value);
  }

  editGroup(group: IdbUtilityMeterGroup) {
    this.router.navigate(['../edit-group/' + group.guid], { relativeTo: this.activatedRoute });
  }

  setDeleteGroup(group: IdbUtilityMeterGroup) {
    this.groupToDelete = group;
  }

  closeDeleteGroup() {
    this.groupToDelete = undefined;
  }


  async deleteMeterGroup() {
    this.loadingService.setLoadingMessage("Deleting Meter Group...");
    this.loadingService.setLoadingStatus(true);
    const groupToDelete = this.groupToDelete;
    const accountGuid = this.accountWorkspaceStore.account()?.guid;
    const groupMeters: Array<IdbUtilityMeter> = this.facilityMeters.filter(meter => meter.groupId == groupToDelete.guid);
    await this.commandBoundary.execute(
      { entityKind: 'meterGroup', changeKind: 'delete', entityGuid: groupToDelete.guid, label: 'Delete Meter Group' },
      async () => {
        await this.meterHandler.deleteMeterGroup(groupToDelete.id);
        for (const meter of groupMeters) {
          meter.groupId = undefined;
          await this.meterHandler.updateMeter(meter, accountGuid);
        }
        await this.meterGroupHandler.deleteGroup(groupToDelete);
      }
    );
    this.closeDeleteGroup();
    this.loadingService.setLoadingStatus(false);
    this.toastNoticationService.showToast("Meter Group Deleted!", undefined, undefined, false, "alert-success");
  }

  viewGroupDataTable(group: IdbUtilityMeterGroup) {
    this.router.navigate(['../data-table/' + group.guid], { relativeTo: this.activatedRoute });
  }

  viewGroupChartData(group: IdbUtilityMeterGroup) {
    this.router.navigate(['../data-chart/' + group.guid], { relativeTo: this.activatedRoute });
  }
}

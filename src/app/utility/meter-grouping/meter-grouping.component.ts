import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { CalanderizationService } from '../../shared/helper-services/calanderization.service';
import { MeterGroupType, MonthlyData } from 'src/app/models/calanderization';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { ToastNotificationsService } from 'src/app/shared/toast-notifications/toast-notifications.service';
import { MeterGroupingService } from './meter-grouping.service';

@Component({
  selector: 'app-meter-grouping',
  templateUrl: './meter-grouping.component.html',
  styleUrls: ['./meter-grouping.component.css']
})
export class MeterGroupingComponent implements OnInit {

  meterGroupTypes: Array<MeterGroupType>;

  groupToEdit: IdbUtilityMeterGroup;
  groupToDelete: IdbUtilityMeterGroup;
  facilityMeterDataSub: Subscription;
  facilityMeterGroupsSub: Subscription;
  selectedFacilitySub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;
  editOrAdd: string;
  facilityMetersSub: Subscription;
  waterUnit: string;
  energyUnit: string;
  lastBillDate: Date;
  yearPriorToLastBill: Date;
  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService, private calanderizationService: CalanderizationService,
    private loadingService: LoadingService, private toastNoticationService: ToastNotificationsService,
    private meterGroupingService: MeterGroupingService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      if (selectedFacility) {
        this.waterUnit = selectedFacility.volumeLiquidUnit;
        this.energyUnit = selectedFacility.energyUnit;
      }
    });

    this.facilityMeterGroupsSub = this.utilityMeterGroupDbService.facilityMeterGroups.subscribe(() => {
      if (this.facilityMeters) {
        this.setGroupTypes();
      }
    });

    this.facilityMeterDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(() => {
      if (this.facilityMeters) {
        this.setGroupTypes();
      }
    });

    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(val => {
      this.facilityMeters = val;
      if (this.facilityMeters) {
        this.setGroupTypes();
      }
    })
  }

  ngOnDestroy() {
    this.facilityMeterGroupsSub.unsubscribe();
    this.facilityMeterDataSub.unsubscribe();
    this.facilityMetersSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  setLastBill() {
     let lastBill: MonthlyData = this.calanderizationService.getLastBillEntry(this.facilityMeters, false);
    if (lastBill) {
      this.lastBillDate = new Date(lastBill.year, lastBill.monthNumValue);
      this.yearPriorToLastBill = new Date(lastBill.year - 1, lastBill.monthNumValue + 1);
    }
  }

  setGroupTypes() {
    this.setLastBill();
    this.meterGroupTypes = this.meterGroupingService.getMeterGroupTypes(this.facilityMeters);
    console.log(this.meterGroupTypes);
  }

  setEditGroup(group: IdbUtilityMeterGroup) {
    this.editOrAdd = 'edit';
    this.groupToEdit = group;
  }

  setDeleteGroup(group: IdbUtilityMeterGroup) {
    let groupMeters: Array<IdbUtilityMeter> = this.facilityMeters.filter(meter => { return meter.groupId == group.id });
    // Check if group has data
    if (groupMeters.length != 0) {
      alert("Group must be empty before deleting.");
    } else {
      this.groupToDelete = group;
    }
  }

  closeEditGroup() {
    this.editOrAdd = undefined;
    this.groupToEdit = undefined;
  }

  closeDeleteGroup() {
    this.groupToDelete = undefined;
  }

  drop(event: CdkDragDrop<string[]>) {
    let draggedMeter: IdbUtilityMeter = this.facilityMeters.find(meter => { return meter.id == event.item.data.id });
    let newGroupId: number = Number(event.container.id);
    draggedMeter.groupId = newGroupId;
    this.setGroupTypes();
    this.utilityMeterDbService.update(draggedMeter);
  }

  groupAdd(groupType: string) {
    this.editOrAdd = 'add';
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.groupToEdit = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup(groupType, 'New Group', facility.id, facility.accountId);
  }

  async deleteMeterGroup() {
    this.loadingService.setLoadingMessage("Deleting Meter Group...");
    this.loadingService.setLoadingStatus(true);
    await this.utilityMeterGroupDbService.deleteWithObservable(this.groupToDelete.id);
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let accountMeterGroups: Array<IdbUtilityMeterGroup> = await this.utilityMeterGroupDbService.getAllByIndexRange("accountId", selectedFacility.accountId).toPromise();
    this.utilityMeterGroupDbService.accountMeterGroups.next(accountMeterGroups);
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = accountMeterGroups.filter(group => { return group.facilityId == selectedFacility.id });
    this.utilityMeterGroupDbService.facilityMeterGroups.next(facilityMeterGroups);
    this.closeDeleteGroup();
    this.loadingService.setLoadingStatus(false);
    this.toastNoticationService.showToast("Meter Group Deleted!", undefined, undefined, false, "success");
  }

  setToggleView(meterGroup) {
    meterGroup.visible = !meterGroup.visible
    if (meterGroup.name != "Ungrouped") {
      this.utilityMeterGroupDbService.update(meterGroup);
    }
  }
}
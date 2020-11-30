import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Component({
  selector: 'app-meter-grouping',
  templateUrl: './meter-grouping.component.html',
  styleUrls: ['./meter-grouping.component.css']
})
export class MeterGroupingComponent implements OnInit {
  meterGroupTypes: Array<{
    meterGroups: Array<IdbUtilityMeterGroup>,
    groupType: string
  }>;

  groupMenuOpen: number;
  groupToEdit: IdbUtilityMeterGroup;
  groupToDelete: IdbUtilityMeterGroup;
  meterGroupIds: Array<string>;
  facilityMetersSub: Subscription;
  facilityMeterGroupsSub: Subscription;
  facilityMeters: Array<IdbUtilityMeter>;
  editOrAdd: string;
  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.facilityMeterGroupsSub = this.utilityMeterGroupDbService.facilityMeterGroups.subscribe(() => {
      this.facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
      this.setGroupTypes();
    });
  }

  ngOnDestroy() {
    this.facilityMeterGroupsSub.unsubscribe();
  }

  setGroupTypes() {
    let meterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.facilityMeterGroups.getValue();
    this.meterGroupTypes = _.chain(meterGroups).groupBy('groupType').map((value: Array<IdbUtilityMeterGroup>, key: string) => {
      return {
        meterGroups: this.setGroupDataSummary(value),
        groupType: key
      }
    }).value();
  }

  setGroupDataSummary(meterGroups: Array<IdbUtilityMeterGroup>): Array<IdbUtilityMeterGroup> {
    this.meterGroupIds = new Array();
    meterGroups.forEach(group => {
      this.meterGroupIds.push(String(group.id));
      let groupMeters: Array<IdbUtilityMeter> = this.facilityMeters.filter(meter => { return meter.groupId == group.id });
      let groupMeterIds: Array<number> = groupMeters.map(meter => { return meter.id });
      let groupMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataFromMeterIds(groupMeterIds);
      group.groupData = groupMeters;
      group.totalEnergyUse = _.sumBy(groupMeterData, 'totalEnergyUse');
    });
    let totalGroupEnergyUse: number = _.sumBy(meterGroups, 'totalEnergyUse');
    meterGroups.forEach(group => {
      group.factionOfTotalEnergy = (group.totalEnergyUse / totalGroupEnergyUse) * 100;
    });
    return meterGroups;
  }

  groupToggleMenu(groupId: number) {
    if (groupId != this.groupMenuOpen) {
      this.groupMenuOpen = groupId;
    } else {
      this.groupMenuOpen = undefined;
    }
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
    this.groupMenuOpen = undefined;
  }

  closeDeleteGroup() {
    this.groupToDelete = undefined;
    this.groupMenuOpen = undefined;
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
    this.groupToEdit = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup(groupType, '', 'New Group', facility.id, facility.accountId);
  }

  deleteMeterGroup() {
    this.utilityMeterGroupDbService.deleteIndex(this.groupToDelete.id);
    this.closeDeleteGroup();
  }
}
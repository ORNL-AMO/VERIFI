import { Component } from '@angular/core';
import { FileReference } from '../../import-services/upload-data-models';
import { ActivatedRoute } from '@angular/router';
import { DataManagementService } from 'src/app/data-management/data-management.service';
import { Subscription } from 'rxjs';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import * as _ from 'lodash';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';

@Component({
  selector: 'app-map-meter-groups-to-equipment',
  standalone: false,
  templateUrl: './map-meter-groups-to-equipment.component.html',
  styleUrl: './map-meter-groups-to-equipment.component.css',
})
export class MapMeterGroupsToEquipmentComponent {
  fileReference: FileReference;
  paramsSub: Subscription;

  facilityMeterGroups: Array<IdbUtilityMeterGroup>;
  facilityMeterGroupsSub: Subscription;

  utilityMeters: Array<IdbUtilityMeter>
  utilityMetersSub: Subscription;

  showLinkMeterEquipmentModal: boolean = false;
  showLinkMeterGroupModal: boolean = false;

  linkingEnergyUseGroup: IdbFacilityEnergyUseGroup;

  linkedMeterGroupEquipment: IdbFacilityEnergyUseEquipment;
  linkedMeterGroups: Array<IdbUtilityMeterGroup> = [];
  linkedMeterGroupIds: Array<string> = [];
  linkedMeterGroupSources: Array<MeterSource> = [];
  linkedMeterGroupOptions: Array<IdbUtilityMeterGroup> = [];
  constructor(
    private activatedRoute: ActivatedRoute,
    private dataManagementService: DataManagementService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private utilityMeterDbService: UtilityMeterdbService
  ) { }


  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.dataManagementService.getFileReferenceById(id);
    });

    this.facilityMeterGroupsSub = this.utilityMeterGroupDbService.accountMeterGroups.subscribe(groups => {
      this.facilityMeterGroups = groups.filter(group => group.facilityId == this.fileReference.selectedFacilityId);
    });

    this.utilityMetersSub = this.utilityMeterDbService.accountMeters.subscribe(meters => {
      this.utilityMeters = meters.filter(meter => meter.facilityId == this.fileReference.selectedFacilityId);
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
    this.facilityMeterGroupsSub.unsubscribe();
    this.utilityMetersSub.unsubscribe();
  }

  openLinkMeterEquipmentTable(equipment: IdbFacilityEnergyUseEquipment) {
    this.linkedMeterGroupEquipment = equipment;
    let equipmentSources: Array<MeterSource> = equipment.utilityData.map(utilityData => utilityData.energySource);
    this.linkedMeterGroupOptions = this.facilityMeterGroups.filter(group => {
      let groupMeterSources: Array<MeterSource> = this.utilityMeters.filter(meter => meter.groupId == group.guid).map(meter => meter.source);
      return _.intersection(equipmentSources, groupMeterSources).length > 0;
    });
    this.setLinkedMeterGroups();
    this.showLinkMeterEquipmentModal = true;
  }

  setLinkedMeterGroups() {
    this.linkedMeterGroupIds = this.linkedMeterGroupEquipment.utilityMeterGroupIds.map(id => id);
    this.setLinkedMeterGroupSources();
  }

  setLinkedMeterGroupSources() {
    let linkedMeters: Array<IdbUtilityMeter> = this.linkedMeterGroupIds.flatMap(id => {
      return this.utilityMeters.filter(meter => meter.groupId == id);
    });
    let sources: Array<MeterSource> = linkedMeters.map(meter => meter.source);
    this.linkedMeterGroupSources = _.uniq(sources);
  }

  cancelLinkMeterEquipment() {
    this.linkedMeterGroupEquipment.utilityMeterGroupIds = [];
    this.linkedMeterGroupEquipment = null;
    this.linkedMeterGroups = [];
    this.linkedMeterGroupIds = [];
    this.linkedMeterGroupSources = [];
    this.linkedMeterGroupSources = [];
    this.showLinkMeterEquipmentModal = false;
  }

  changeLinkedMeterGroup(meterGroup: IdbUtilityMeterGroup, meterGroupConflict: boolean) {
    if (this.linkedMeterGroupEquipment.utilityMeterGroupIds.includes(meterGroup.guid)) {
      this.linkedMeterGroupEquipment.utilityMeterGroupIds = this.linkedMeterGroupEquipment.utilityMeterGroupIds.filter(id => id != meterGroup.guid);
    } else {
      if (!meterGroupConflict) {
        this.linkedMeterGroupEquipment.utilityMeterGroupIds.push(meterGroup.guid);
      }
    }
    this.setLinkedMeterGroups();
  }

  closeLinkMeterEquipment() {
    this.linkedMeterGroupEquipment = null;
    this.linkedMeterGroups = [];
    this.linkedMeterGroupIds = [];
    this.linkedMeterGroupSources = [];
    this.linkedMeterGroupSources = [];
    this.showLinkMeterEquipmentModal = false;
  }

  openLinkMeterGroupTable(energyUseGroup: IdbFacilityEnergyUseGroup) {
    this.linkingEnergyUseGroup = energyUseGroup;
    let equipmentInGroup: Array<IdbFacilityEnergyUseEquipment> = this.fileReference.facilityEnergyUseEquipment.filter(equipment => equipment.energyUseGroupId == energyUseGroup.guid);
    let equipmentSources: Array<MeterSource> = equipmentInGroup.flatMap(equipment => equipment.utilityData.map(utilityData => utilityData.energySource));
    this.linkedMeterGroupOptions = this.facilityMeterGroups.filter(group => {
      let groupMeterSources: Array<MeterSource> = this.utilityMeters.filter(meter => meter.groupId == group.guid).map(meter => meter.source);
      return _.intersection(equipmentSources, groupMeterSources).length > 0;
    });
    this.showLinkMeterGroupModal = true;
  }

  changeLinkedMeterGroupForEnergyUseGroup(meterGroup: IdbUtilityMeterGroup, meterGroupConflict: boolean) {
    if (this.linkedMeterGroupIds.includes(meterGroup.guid)) {
      this.linkedMeterGroupIds = this.linkedMeterGroupIds.filter(id => id != meterGroup.guid);
    } else {
      if (!meterGroupConflict) {
        this.linkedMeterGroupIds.push(meterGroup.guid);
      }
    }
    this.setLinkedMeterGroupSources();
  }

  cancelLinkMeterGroup() {
    this.linkingEnergyUseGroup = undefined;
    this.linkedMeterGroupIds = [];
    this.linkedMeterGroupSources = [];
    this.linkedMeterGroupSources = [];
    this.showLinkMeterGroupModal = false;
  }

  submitLinkMeterGroups() {
    this.fileReference.facilityEnergyUseEquipment.forEach(equipment => {
      if (equipment.energyUseGroupId == this.linkingEnergyUseGroup.guid) {
        //check equipment has source that matches linked meter groups
        let equipmentSources: Array<MeterSource> = equipment.utilityData.map(utilityData => utilityData.energySource);
        let linkedMeters: Array<IdbUtilityMeter> = this.linkedMeterGroupIds.flatMap(id => {
          return this.utilityMeters.filter(meter => meter.groupId == id);
        });
        equipment.utilityMeterGroupIds = [];
        linkedMeters.forEach(meter => {
          if (equipmentSources.includes(meter.source) && !equipment.utilityMeterGroupIds.includes(meter.groupId)) {
            equipment.utilityMeterGroupIds.push(meter.groupId);
          }
        })
      }
    });
    this.cancelLinkMeterGroup();
  }


}

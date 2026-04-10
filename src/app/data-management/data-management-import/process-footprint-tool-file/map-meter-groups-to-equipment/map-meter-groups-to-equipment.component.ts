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

  showLinkMeterModal: boolean = false;

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

  openLinkMeterTable(equipment: IdbFacilityEnergyUseEquipment) {
    this.linkedMeterGroupEquipment = equipment;
    let equipmentSources: Array<MeterSource> = equipment.utilityData.map(utilityData => utilityData.energySource);
    this.linkedMeterGroupOptions = this.facilityMeterGroups.filter(group => {
      let groupMeterSources: Array<MeterSource> = this.utilityMeters.filter(meter => meter.groupId == group.guid).map(meter => meter.source);
      return _.intersection(equipmentSources, groupMeterSources).length > 0;
    });
    this.setLinkedMeterGroups();
    this.showLinkMeterModal = true;
  }

  setLinkedMeterGroups() {
    this.linkedMeterGroupIds = this.linkedMeterGroupEquipment.utilityMeterGroupIds.map(id => id);
    let linkedMeters: Array<IdbUtilityMeter> = this.linkedMeterGroupIds.flatMap(id => {
      return this.utilityMeters.filter(meter => meter.groupId == id);
    });
    let sources: Array<MeterSource> = linkedMeters.map(meter => meter.source);
    this.linkedMeterGroupSources = _.uniq(sources);
  }


  cancelLinkMeterGroup() {
    this.linkedMeterGroupEquipment.utilityMeterGroupIds = [];
    this.linkedMeterGroupEquipment = null;
    this.linkedMeterGroups = [];
    this.linkedMeterGroupIds = [];
    this.linkedMeterGroupSources = [];
    this.showLinkMeterModal = false;
  }

  changeLinkedMeterGroup(meterGroup: IdbUtilityMeterGroup) {
    if (this.linkedMeterGroupEquipment.utilityMeterGroupIds.includes(meterGroup.guid)) {
      this.linkedMeterGroupEquipment.utilityMeterGroupIds = this.linkedMeterGroupEquipment.utilityMeterGroupIds.filter(id => id != meterGroup.guid);
    } else {
      this.linkedMeterGroupEquipment.utilityMeterGroupIds.push(meterGroup.guid);
    }
    this.setLinkedMeterGroups();
  }

  closeLinkMeterGroup() {
    this.showLinkMeterModal = false;
  }
}

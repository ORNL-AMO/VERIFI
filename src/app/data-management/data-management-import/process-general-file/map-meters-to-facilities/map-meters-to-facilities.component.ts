import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataManagementService } from 'src/app/data-management/data-management.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { getNewIdbFacility, IdbFacility } from 'src/app/models/idbModels/facility';
import { ColumnItem, FacilityGroup, FileReference } from 'src/app/upload-data/upload-data-models';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';

@Component({
  selector: 'app-map-meters-to-facilities',
  standalone: false,

  templateUrl: './map-meters-to-facilities.component.html',
  styleUrl: './map-meters-to-facilities.component.css'
})
export class MapMetersToFacilitiesComponent {
  fileReferences: Array<FileReference>;
  fileReferenceSub: Subscription;
  facilityGroupIds: Array<string>;
  fileReference: FileReference;
  paramsSub: Subscription;
  importMetersFound: boolean;
  displayAddFacilityModal: boolean = false;
  addFacilityName: string = 'New Facility';
  constructor(private dataManagementService: DataManagementService,
    private activatedRoute: ActivatedRoute,
    private uploadDataService: UploadDataService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.fileReferenceSub = this.dataManagementService.fileReferences.subscribe(fileReferences => {
      this.fileReferences = fileReferences;
    });
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.fileReferences.find(ref => { return ref.id == id });
      this.setMeterGroupsFound();
      if (this.importMetersFound) {
        if (this.fileReference.meterFacilityGroups.length == 0) {
          this.setFacilityGroups();
        }
        this.facilityGroupIds = this.fileReference.meterFacilityGroups.map(group => { return group.facilityId });
      }
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }


  setFacilityGroups() {
    let facilityGroups: Array<FacilityGroup> = new Array();
    let meterIndex: number = 0;
    let unmappedMeters: Array<ColumnItem> = new Array();
    let initialMeterMap: Array<ColumnItem> = new Array();
    this.fileReference.columnGroups.forEach(group => {
      if (group.groupLabel == 'Meters') {
        group.groupItems.forEach(item => {
          initialMeterMap.push({
            index: meterIndex,
            value: item.value,
            id: item.id,
            // fileName: ref.name
          });
          meterIndex++;
        })
      }
    });
    if (this.fileReference.selectedFacilityId == undefined) {
      unmappedMeters = initialMeterMap;
    }
    facilityGroups.push({
      facilityId: Math.random().toString(36).substr(2, 9),
      groupItems: unmappedMeters,
      facilityName: 'Unmapped Meters',
      color: ''
    })
    // let idbFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.fileReference.importFacilities.forEach(facility => {
      let groupItems: Array<ColumnItem> = new Array();
      if (facility.guid == this.fileReference.selectedFacilityId) {
        groupItems = initialMeterMap;
      }
      facilityGroups.push({
        facilityId: facility.guid,
        groupItems: groupItems,
        facilityName: facility.name,
        color: facility.color
      });
    });
    this.fileReference.meterFacilityGroups = facilityGroups;
    this.fileReference.meters = this.uploadDataService.parseMetersFromGroups(this.fileReference);
  }

  dropColumn(dropData: CdkDragDrop<FacilityGroup[]>) {
    this.fileReference.meterFacilityGroups.forEach(group => {
      if (group.facilityId == dropData.previousContainer.id) {
        //remove
        let itemIndex: number = group.groupItems.findIndex(groupItem => { return groupItem.id == dropData.item.data.id });
        if (itemIndex > -1) {
          group.groupItems.splice(itemIndex, 1);
        }
      }
      if (group.facilityId == dropData.container.id) {
        //add
        group.groupItems.push(dropData.item.data);
      }
    });
    this.fileReference.meters = this.uploadDataService.parseMetersFromGroups(this.fileReference);
  }

  setFacility(facilityId: string) {
    let facilityGroups: Array<FacilityGroup> = new Array();
    let meterIndex: number = 0;
    let facilityMeters: Array<ColumnItem> = new Array();
    this.fileReference.columnGroups.forEach(group => {
      if (group.groupLabel == 'Meters') {
        group.groupItems.forEach(item => {
          facilityMeters.push({
            index: meterIndex,
            value: item.value,
            id: item.id,
            // fileName: ref.name
          });
          meterIndex++;
        })
      }
    });
    facilityGroups.push({
      facilityId: Math.random().toString(36).substr(2, 9),
      groupItems: [],
      facilityName: 'Unmapped Meters',
      color: ''
    })
    // let idbFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.fileReference.importFacilities.forEach(facility => {
      if (facility.guid == facilityId) {
        facilityGroups.push({
          facilityId: facility.guid,
          groupItems: facilityMeters,
          facilityName: facility.name,
          color: facility.color
        });
      } else {
        facilityGroups.push({
          facilityId: facility.guid,
          groupItems: [],
          facilityName: facility.name,
          color: facility.color
        });
      }
    });
    this.fileReference.meterFacilityGroups = facilityGroups;
    this.facilityGroupIds = this.fileReference.meterFacilityGroups.map(group => { return group.facilityId });
    this.fileReference.meters = this.uploadDataService.parseMetersFromGroups(this.fileReference);
  }

  setMeterGroupsFound() {
    let importMetersFound: boolean = false;
    this.fileReference.columnGroups.forEach(group => {
      if (group.groupLabel == 'Meters' && group.groupItems.length != 0) {
        importMetersFound = true;
      }
    });
    this.importMetersFound = importMetersFound;
  }

  openAddFacilityModal() {
    this.addFacilityName = 'New Facility';
    this.displayAddFacilityModal = true;
  }

  cancelAddFacility() {
    this.displayAddFacilityModal = false;
  }

  addFacility() {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let newFacility: IdbFacility = getNewIdbFacility(account);
    newFacility.name = this.addFacilityName;
    this.fileReference.importFacilities.push(newFacility);
    this.fileReference.meterFacilityGroups.push({
      facilityId: newFacility.guid,
      groupItems: [],
      facilityName: newFacility.name,
      color: newFacility.color
    });
    if (this.fileReference.predictorFacilityGroups.length > 0) {
      this.fileReference.predictorFacilityGroups.push({
        facilityId: newFacility.guid,
        groupItems: [],
        facilityName: newFacility.name,
        color: newFacility.color
      });

    }
    this.facilityGroupIds.push(newFacility.guid);
    this.cancelAddFacility();
  }
}

import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { ColumnItem, FacilityGroup, FileReference, UploadDataService } from '../../../upload-data.service';

@Component({
  selector: 'app-set-facility-meters',
  templateUrl: './set-facility-meters.component.html',
  styleUrls: ['./set-facility-meters.component.css']
})
export class SetFacilityMetersComponent implements OnInit {

  facilityGroupIds: Array<string>;
  fileReference: FileReference = {
    name: '',
    file: undefined,
    dataSubmitted: false,
    id: undefined,
    workbook: undefined,
    isTemplate: false,
    selectedWorksheetName: '',
    selectedWorksheetData: [],
    columnGroups: [],
    headerMap: [],
    meterFacilityGroups: [],
    predictorFacilityGroups: [],
    importFacilities: [],
    meters: [],
    meterData: [],
    predictorEntries: [],
    skipExistingReadingsMeterIds: [],
    skipExistingPredictorFacilityIds: [],
    newMeterGroups: [],
    selectedFacilityId: undefined
  };
  paramsSub: Subscription;
  importMetersFound: boolean;
  constructor(private uploadDataService: UploadDataService, private facilityDbService: FacilitydbService,
    private router: Router, private activatedRoute: ActivatedRoute) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
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
    let idbFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    idbFacilities.forEach(facility => {
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
  }

  continue() {
    this.fileReference.meters = this.uploadDataService.parseMetersFromGroups(this.fileReference);
    let fileReferenceIndex: number = this.uploadDataService.fileReferences.findIndex(file => { return file.id == this.fileReference.id });
    this.uploadDataService.fileReferences[fileReferenceIndex] = this.fileReference;
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/manage-meters');
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
    let idbFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    idbFacilities.forEach(facility => {
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
  }

  goBack() {
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/identify-columns');
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
}

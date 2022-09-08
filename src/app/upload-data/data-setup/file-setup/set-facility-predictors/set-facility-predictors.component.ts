import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { ColumnItem, FacilityGroup, FileReference, UploadDataService } from '../../../upload-data.service';

@Component({
  selector: 'app-set-facility-predictors',
  templateUrl: './set-facility-predictors.component.html',
  styleUrls: ['./set-facility-predictors.component.css']
})
export class SetFacilityPredictorsComponent implements OnInit {

  // facilityGroups: Array<FacilityGroup>;
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
    predictorEntries: []
  };
  paramsSub: Subscription;
  constructor(private uploadDataService: UploadDataService, private facilityDbService: FacilitydbService, private router: Router,
    private activatedRoute: ActivatedRoute) { }

  ngOnInit(): void {
   this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
      if (this.fileReference.predictorFacilityGroups.length == 0) {
        this.setFacilityGroups();
      }
      this.facilityGroupIds = this.fileReference.predictorFacilityGroups.map(group => { return group.facilityId });
    });
  }

  ngOnDestroy(){
    this.paramsSub.unsubscribe();
  }

  setFacilityGroups() {
    let facilityGroups: Array<FacilityGroup> = new Array();
    let unmappedPredictors: Array<ColumnItem> = this.getFacilityPredictors();
    facilityGroups.push({
      facilityId: Math.random().toString(36).substr(2, 9),
      groupItems: unmappedPredictors,
      facilityName: 'Unmapped Predictors',
      color: ''
    })
    let idbFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    idbFacilities.forEach(facility => {
      facilityGroups.push({
        facilityId: facility.guid,
        groupItems: [],
        facilityName: facility.name,
        color: facility.color
      });
    });
    this.fileReference.predictorFacilityGroups = facilityGroups;
  }

  dropColumn(dropData: CdkDragDrop<string[]>) {
    this.fileReference.predictorFacilityGroups.forEach(group => {
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
    // this.router.navigateByUrl('/upload/data-setup/set-facility-predictors');
    let fileReferenceIndex: number = this.uploadDataService.fileReferences.findIndex(ref => { return this.fileReference.id == ref.id });
    if (fileReferenceIndex == this.uploadDataService.fileReferences.length - 1) {
      //continue to meters
      this.router.navigateByUrl('/upload/data-setup/set-facility-meters');
    } else {
      //go to next file
      let nextFile: FileReference = this.uploadDataService.fileReferences[fileReferenceIndex + 1];
      this.router.navigateByUrl('/upload/data-setup/file-setup/' + nextFile.id + '/select-worksheet');
    }
  }

  setFacility(facilityId: string) {
    let facilityGroups: Array<FacilityGroup> = new Array();
    let facilityPredictors: Array<ColumnItem> = this.getFacilityPredictors();
    facilityGroups.push({
      facilityId: Math.random().toString(36).substr(2, 9),
      groupItems: [],
      facilityName: 'Unmapped Predictors',
      color: ''
    })
    let idbFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    idbFacilities.forEach(facility => {
      if (facility.guid == facilityId) {
        facilityGroups.push({
          facilityId: facility.guid,
          groupItems: facilityPredictors,
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
    this.fileReference.predictorFacilityGroups = facilityGroups;
    this.facilityGroupIds = this.fileReference.predictorFacilityGroups.map(group => { return group.facilityId });
  }

  getFacilityPredictors(): Array<ColumnItem> {
    let meterIndex: number = 0;
    let facilityPredictors: Array<ColumnItem> = new Array();
    this.fileReference.columnGroups.forEach(group => {
      if (group.groupLabel == 'Predictors') {
        group.groupItems.forEach(item => {
          facilityPredictors.push({
            index: meterIndex,
            value: item.value,
            id: item.id,
            // fileName: ref.name
          });
          meterIndex++;
        })
      }
    });
    return facilityPredictors;
  }
}

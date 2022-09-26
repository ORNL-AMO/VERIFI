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
    predictorEntries: [],
    skipExistingReadingsMeterIds: [],
    skipExistingPredictorFacilityIds: [],
    newMeterGroups: [],
    selectedFacilityId: undefined
  };
  paramsSub: Subscription;
  predictorsIncluded: boolean;
  constructor(private uploadDataService: UploadDataService, private facilityDbService: FacilitydbService, private router: Router,
    private activatedRoute: ActivatedRoute) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
      this.setPredictorsIncluded();
      if (this.predictorsIncluded) {
        if (this.fileReference.predictorFacilityGroups.length == 0) {
          this.setFacilityGroups();
        }
        this.facilityGroupIds = this.fileReference.predictorFacilityGroups.map(group => { return group.facilityId });
      }
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  setFacilityGroups() {
    let facilityGroups: Array<FacilityGroup> = new Array();
    let unmappedPredictors: Array<ColumnItem> = new Array();
    let initialPredictorMap: Array<ColumnItem> = this.getFacilityPredictors();
    if(this.fileReference.selectedFacilityId == undefined){
      unmappedPredictors = initialPredictorMap;
    }
    facilityGroups.push({
      facilityId: Math.random().toString(36).substr(2, 9),
      groupItems: unmappedPredictors,
      facilityName: 'Unmapped Predictors',
      color: ''
    })
    let idbFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    idbFacilities.forEach(facility => {
      let groupItems: Array<ColumnItem> = new Array();
      if(this.fileReference.selectedFacilityId == facility.guid){
        groupItems = initialPredictorMap;
      }
      facilityGroups.push({
        facilityId: facility.guid,
        groupItems: groupItems,
        facilityName: facility.name,
        color: facility.color
      });
    });
    this.fileReference.predictorFacilityGroups = facilityGroups;
  }

  dropColumn(dropData: CdkDragDrop<FacilityGroup[]>) {
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
    if (this.predictorsIncluded) {
      this.fileReference.predictorEntries = this.uploadDataService.parseExcelPredictorsData(this.fileReference);
    }
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/confirm-predictors');
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

  goBack() {
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/confirm-readings');
  }

  setPredictorsIncluded() {
    let predictorsIncluded: boolean = false;
    this.fileReference.columnGroups.forEach(group => {
      if (group.groupLabel == 'Predictors' && group.groupItems.length != 0) {
        predictorsIncluded = true;
      }
    });
    this.predictorsIncluded = predictorsIncluded;
  }
}

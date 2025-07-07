import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ColumnItem, FacilityGroup, FileReference, getEmptyFileReference } from 'src/app/upload-data/upload-data-models';
import { getNewIdbFacility, IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { DataManagementService } from 'src/app/data-management/data-management.service';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

@Component({
  selector: 'app-map-predictors-to-facilities',
  standalone: false,

  templateUrl: './map-predictors-to-facilities.component.html',
  styleUrl: './map-predictors-to-facilities.component.css'
})
export class MapPredictorsToFacilitiesComponent {
  fileReferences: Array<FileReference>;
  fileReferenceSub: Subscription;
  facilityGroupIds: Array<string>;
  fileReference: FileReference = getEmptyFileReference();
  paramsSub: Subscription;
  predictorsIncluded: boolean;
  displayAddFacilityModal: boolean = false;
  addFacilityName: string = 'New Facility';
  constructor(private dataManagementService: DataManagementService,
    private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.fileReferenceSub = this.dataManagementService.fileReferences.subscribe(fileReferences => {
      this.fileReferences = fileReferences;
    });
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.fileReferences.find(ref => { return ref.id == id });
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
    if (this.fileReference.selectedFacilityId == undefined) {
      unmappedPredictors = initialPredictorMap;
    }
    facilityGroups.push({
      facilityId: Math.random().toString(36).substr(2, 9),
      groupItems: unmappedPredictors,
      facilityName: 'Unmapped Predictors',
      color: ''
    })
    this.fileReference.importFacilities.forEach(facility => {
      let groupItems: Array<ColumnItem> = new Array();
      if (this.fileReference.selectedFacilityId == facility.guid) {
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
    this.parsePredictors();
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
    this.parsePredictors();
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
    this.fileReference.importFacilities.forEach(facility => {
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
    this.parsePredictors();
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

  setPredictorsIncluded() {
    let predictorsIncluded: boolean = false;
    this.fileReference.columnGroups.forEach(group => {
      if (group.groupLabel == 'Predictors' && group.groupItems.length != 0) {
        predictorsIncluded = true;
      }
    });
    this.predictorsIncluded = predictorsIncluded;
  }

  parsePredictors() {
    let parsedPredictors: { predictors: Array<IdbPredictor>, predictorData: Array<IdbPredictorData> } = this.uploadDataService.parseExcelPredictorsData(this.fileReference);
    this.fileReference.predictors = parsedPredictors.predictors;
    this.fileReference.predictorData = parsedPredictors.predictorData;
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
    this.fileReference.predictorFacilityGroups.push({
      facilityId: newFacility.guid,
      groupItems: [],
      facilityName: newFacility.name,
      color: newFacility.color
    })
    this.fileReference.meterFacilityGroups.push({
      facilityId: newFacility.guid,
      groupItems: [],
      facilityName: newFacility.name,
      color: newFacility.color
    })
    this.facilityGroupIds.push(newFacility.guid);
    this.cancelAddFacility();
  }
}

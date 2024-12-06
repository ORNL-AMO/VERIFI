import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';
import * as _ from 'lodash';
import { FileReference, getEmptyFileReference } from 'src/app/upload-data/upload-data-models';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';

@Component({
  selector: 'app-confirm-predictors',
  templateUrl: './confirm-predictors.component.html',
  styleUrls: ['./confirm-predictors.component.css']
})
export class ConfirmPredictorsComponent implements OnInit {
  
  fileReference: FileReference = getEmptyFileReference();
  paramsSub: Subscription;
  predictorDataSummaries: Array<PredictorDataSummary>;
  predictorsExist: boolean;
  skipAll: boolean = false;
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private router: Router) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
      this.predictorsExist = this.fileReference.predictors.length != 0 || this.fileReference.predictorData.length != 0;
      this.setSummary();
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  continue() {
    this.fileReference.predictors = this.uploadDataService.updateProductionPredictorData(this.fileReference);
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/submit');
  }

  setSummary() {
    let dataSummaries: Array<PredictorDataSummary> = new Array();
    this.fileReference.importFacilities.forEach(facility => {
      let predictorData: Array<IdbPredictorData> = this.fileReference.predictorData.filter(data => { return data.facilityId == facility.guid });
      if (predictorData.length != 0) {
        let existingData: Array<IdbPredictorData> = new Array()
        let newPredictorData: Array<IdbPredictorData> = new Array()
        predictorData.forEach(pData => {
          if (pData.id) {
            existingData.push(pData);
          } else {
            newPredictorData.push(pData);
          }
        });

        let existingStart: Date;
        let existingEnd: Date;
        if (existingData.length != 0) {
          existingStart = _.minBy(existingData, (pData: IdbPredictorData) => { return pData.date }).date
          existingEnd = _.maxBy(existingData, (pData: IdbPredictorData) => { return pData.date }).date
        }

        let newStart: Date;
        let newEnd: Date;
        if (newPredictorData.length != 0) {
          newStart = _.minBy(newPredictorData, (pData: IdbPredictorData) => { return pData.date }).date
          newEnd = _.maxBy(newPredictorData, (pData: IdbPredictorData) => { return pData.date }).date
        }

        let skipExisting: string = this.fileReference.skipExistingPredictorFacilityIds.find(facilityId => { return facilityId == facility.guid })
        dataSummaries.push({
          facilityName: facility.name,
          existingEntries: existingData.length,
          existingStart: existingStart,
          existingEnd: existingEnd,
          newEntries: newPredictorData.length,
          newStart: newStart,
          newEnd: newEnd,
          skipExisting: skipExisting != undefined
        })
      }
    })
    this.predictorDataSummaries = dataSummaries;
  }


  goBack() {
    if (this.fileReference.isTemplate) {
      this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/confirm-readings');
    } else {
      this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/set-facility-predictors');
    }
  }

  setSkipAll() {
    this.predictorDataSummaries.forEach(summary => {
      summary.skipExisting = this.skipAll;
    });
  }
}

export interface PredictorDataSummary {
  facilityName: string,
  existingEntries: number,
  existingStart: Date,
  existingEnd: Date,
  newEntries: number,
  newStart: Date,
  newEnd: Date,
  skipExisting: boolean
}
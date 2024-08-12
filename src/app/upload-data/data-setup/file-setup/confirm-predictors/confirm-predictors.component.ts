import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UploadDataService } from 'src/app/upload-data/upload-data.service';
import * as _ from 'lodash';
import { FileReference, getEmptyFileReference } from 'src/app/upload-data/upload-data-models';
import { LoadingService } from 'src/app/core-components/loading/loading.service';

@Component({
  selector: 'app-confirm-predictors',
  templateUrl: './confirm-predictors.component.html',
  styleUrls: ['./confirm-predictors.component.css']
})
export class ConfirmPredictorsComponent implements OnInit {
  //TODO: 1668
  fileReference: FileReference = getEmptyFileReference();
  paramsSub: Subscription;
  predictorDataSummaries: Array<PredictorDataSummary>;
  predictorsExist: boolean;
  skipAll: boolean = false;
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService,
    private router: Router, private loadingService: LoadingService) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
      // this.predictorsExist = this.fileReference.predictorEntries.length != 0;
      this.setSummary();
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  async continue() {
    this.loadingService.setLoadingMessage("Updating predictor entries...");
    this.loadingService.setLoadingStatus(true);
    // this.fileReference.predictorEntries = this.uploadDataService.updateProductionPredictorData(this.fileReference);
    // this.fileReference.predictorEntries = await this.uploadDataService.updateDegreeDays(this.fileReference);
    this.loadingService.setLoadingStatus(false);
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReference.id + '/submit');
  }

  setSummary() {
    let dataSummaries: Array<PredictorDataSummary> = new Array();
    // this.fileReference.importFacilities.forEach(facility => {
    //   let predictorEntries: Array<IdbPredictorEntry> = this.fileReference.predictorEntries.filter(data => { return data.facilityId == facility.guid });
    //   if (predictorEntries.length != 0) {
    //     let existingEntries: Array<IdbPredictorEntry> = new Array()
    //     let newEntries: Array<IdbPredictorEntry> = new Array()
    //     predictorEntries.forEach(entry => {
    //       if (entry.id) {
    //         existingEntries.push(entry);
    //       } else {
    //         newEntries.push(entry);
    //       }
    //     });

    //     let existingStart: Date;
    //     let existingEnd: Date;
    //     if (existingEntries.length != 0) {
    //       existingStart = _.minBy(existingEntries, (entry) => { return entry.date }).date
    //       existingEnd = _.maxBy(existingEntries, (entry) => { return entry.date }).date
    //     }

    //     let newStart: Date;
    //     let newEnd: Date;
    //     if (newEntries.length != 0) {
    //       newStart = _.minBy(newEntries, (entry) => { return entry.date }).date
    //       newEnd = _.maxBy(newEntries, (entry) => { return entry.date }).date
    //     }

    //     let skipExisting: string = this.fileReference.skipExistingPredictorFacilityIds.find(facilityId => { return facilityId == facility.guid })
    //     dataSummaries.push({
    //       facilityName: facility.name,
    //       existingEntries: existingEntries.length,
    //       existingStart: existingStart,
    //       existingEnd: existingEnd,
    //       newEntries: newEntries.length,
    //       newStart: newStart,
    //       newEnd: newEnd,
    //       skipExisting: skipExisting != undefined
    //     })
    //   }
    // })
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
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataWizardService } from 'src/app/data-wizard/data-wizard.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import * as _ from 'lodash';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-process-predictor-readings',
  standalone: false,

  templateUrl: './process-predictor-readings.component.html',
  styleUrl: './process-predictor-readings.component.css'
})
export class ProcessPredictorReadingsComponent {
  fileReference: FileReference;
  paramsSub: Subscription;
  predictorDataSummaries: Array<PredictorDataSummary>;
  predictorsExist: boolean;
  skipAll: boolean = false;
  constructor(private activatedRoute: ActivatedRoute, private dataWizardService: DataWizardService) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.dataWizardService.getFileReferenceById(id);
      this.predictorsExist = this.fileReference.predictors.length != 0 || this.fileReference.predictorData.length != 0;
      this.setSummary();
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  setSummary() {
    let dataSummaries: Array<PredictorDataSummary> = new Array();
    this.fileReference.predictors.forEach(predictor => {
      let facility: IdbFacility = this.fileReference.importFacilities.find(facility => { return facility.guid == predictor.facilityId });
      let skipExisting: string = this.fileReference.skipExistingPredictorFacilityIds.find(facilityId => { return facilityId == predictor.facilityId })
      if (!predictor.skipImport && !skipExisting) {
        let predictorData: Array<IdbPredictorData> = this.fileReference.predictorData.filter(data => { return data.predictorId == predictor.guid });
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
          dataSummaries.push({
            facilityName: facility.name,
            existingEntries: existingData.length,
            existingStart: existingStart,
            existingEnd: existingEnd,
            newEntries: newPredictorData.length,
            newStart: newStart,
            newEnd: newEnd,
            skipExisting: skipExisting != undefined,
            predictor: predictor
          })
        }
      }
    })
    this.predictorDataSummaries = dataSummaries;
  }

  setSkipAll() {
    this.predictorDataSummaries.forEach(summary => {
      summary.skipExisting = this.skipAll;
    });
  }
}

export interface PredictorDataSummary {
  predictor: IdbPredictor,
  facilityName: string,
  existingEntries: number,
  existingStart: Date,
  existingEnd: Date,
  newEntries: number,
  newStart: Date,
  newEnd: Date,
  skipExisting: boolean
}

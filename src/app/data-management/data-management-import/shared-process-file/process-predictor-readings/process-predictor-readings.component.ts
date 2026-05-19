import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataManagementService } from 'src/app/data-management/data-management.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { FileReference } from 'src/app/data-management/data-management-import/import-services/upload-data-models';
import * as _ from 'lodash';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { getDateFromPredictorData, getEarliestPredictorDataDate, getLatestPredictorDataDate } from 'src/app/shared/dateHelperFunctions';

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
  showModal: boolean = false;
  readingDifferencesMap: { [predictorId: string]: Array<PredictorReadingComparison> } = {};
  selectedPredictorName: string;
  selectedPredictorUnit: string;
  comparisonSummaryWithDifferences: Array<PredictorReadingComparison> = [];
  orderDataField: string = 'readDate';
  orderByDirection: 'asc' | 'desc' = 'desc';

  constructor(private activatedRoute: ActivatedRoute, private dataManagementService: DataManagementService,
    private predictorDataDbService: PredictorDataDbService) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.dataManagementService.getFileReferenceById(id);
      this.predictorsExist = this.fileReference.predictors.length != 0 || this.fileReference.predictorData.length != 0;
      this.setSummary();
      this.comparePredictorReadings();
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  comparePredictorReadings() {
    this.readingDifferencesMap = {};
    let accountPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    this.fileReference.predictorData.forEach(newData => {
      const key = `${newData.predictorId}_${newData.facilityId}`;
      if (!this.readingDifferencesMap[key]) {
        this.readingDifferencesMap[key] = [];
      }

      const existingPredictorReadings = accountPredictorData.filter(data => (data.predictorId === newData.predictorId && data.facilityId === newData.facilityId));
      existingPredictorReadings.forEach(oldData => {
        if (oldData.month == newData.month && oldData.year == newData.year) {
          let difference: number = Math.abs(newData.amount - oldData.amount);
          let percentageDifference: number = (oldData.amount !== 0) ? (difference / oldData.amount * 100) : null;
          if (difference !== 0) {
            this.readingDifferencesMap[key].push({
              readDate: getDateFromPredictorData(newData),
              oldReading: oldData.amount,
              newReading: newData.amount,
              difference: difference,
              percentageDifference: percentageDifference
            });
          }
        }
      });
    });
  }

  openModal(summary: PredictorDataSummary) {
    this.selectedPredictorName = summary.predictor.name;
    this.selectedPredictorUnit = summary.predictor.unit;
    this.comparisonSummaryWithDifferences = this.readingDifferencesMap[summary.predictor.guid + '_' + summary.predictor.facilityId];
    this.showModal = true;
  }

  hideModal() {
    this.showModal = false;
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
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
            existingStart = getEarliestPredictorDataDate(existingData);
            existingEnd = getLatestPredictorDataDate(existingData);
          }

          let newStart: Date;
          let newEnd: Date;
          if (newPredictorData.length != 0) {
            newStart = getEarliestPredictorDataDate(newPredictorData);
            newEnd = getLatestPredictorDataDate(newPredictorData);
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
    });
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

export interface PredictorReadingComparison {
  readDate?: Date;
  oldReading?: number;
  newReading?: number;
  difference: number;
  percentageDifference: number;
}

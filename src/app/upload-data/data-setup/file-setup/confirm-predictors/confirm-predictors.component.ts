import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { FileReference, UploadDataService } from 'src/app/upload-data/upload-data.service';

@Component({
  selector: 'app-confirm-predictors',
  templateUrl: './confirm-predictors.component.html',
  styleUrls: ['./confirm-predictors.component.css']
})
export class ConfirmPredictorsComponent implements OnInit {

  fileReference: FileReference = {
    name: '',
    file: undefined,
    dataSet: false,
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
  predictorDataSummaries: Array<PredictorDataSummary>;
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
      console.log(this.fileReference.predictorEntries);
      this.setSummary();
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  continue() {

  }

  setSummary() {
    let dataSummaries: Array<PredictorDataSummary> = new Array();
    this.fileReference.importFacilities.forEach(facility => {
      let predictorEntries: Array<IdbPredictorEntry> = this.fileReference.predictorEntries.filter(data => { return data.facilityId == facility.guid });
      let existingEntries: Array<IdbPredictorEntry> = new Array()
      let newEntries: Array<IdbPredictorEntry> = new Array()
      predictorEntries.forEach(entry => {
        if (entry.id) {
          existingEntries.push(entry);
        } else {
          newEntries.push(entry);
        }
      });
      dataSummaries.push({
        facilityName: facility.name,
        existingEntries: existingEntries.length,
        newEntries: newEntries.length
      })
    })
    this.predictorDataSummaries = dataSummaries;
  }

}

export interface PredictorDataSummary {
  facilityName: string,
  existingEntries: number,
  newEntries: number
}
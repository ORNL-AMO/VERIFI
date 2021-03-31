import { Injectable } from '@angular/core';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbFacility, IdbPredictorEntry, PredictorData } from 'src/app/models/idb';

@Injectable({
  providedIn: 'root'
})
export class ImportPredictorsService {

  constructor(private predictorsDbService: PredictordbService) { }

  getSummaryFromTemplatesFile(fileData: Array<any>, predictorHeaders: Array<string>, facilityPredictors: Array<PredictorData>, facilityPredictorEntries: Array<IdbPredictorEntry>): ImportPredictorFileSummary {
    console.log(predictorHeaders);
    let existingPredictors: Array<PredictorData> = new Array();
    let newPredictors: Array<PredictorData> = new Array();
    predictorHeaders.forEach(header => {
      if (header != 'Date') {
        //possibly use "includes" instead of == for check
        let headerExists: PredictorData = facilityPredictors.find(predictor => { return predictor.name == header });
        if (headerExists) {
          existingPredictors.push(headerExists);
        } else {
          let newPredictor: PredictorData = this.predictorsDbService.getNewPredictor(facilityPredictors);
          newPredictor.name = header;
          newPredictors.push(newPredictor);
        }
      }
    });

    //update existing entries with new predictors?
    let splitData: { newEntries: Array<any>, existingEntries: Array<any> } = this.splitExistingAndNewEntries(fileData, facilityPredictorEntries);

    return {
      existingPredictors: existingPredictors,
      newPredictors: newPredictors,
      existingPredictorEntries: splitData.existingEntries,
      newPredictorEntries: splitData.newEntries
    };
  }


  splitExistingAndNewEntries(fileData: Array<any>, facilityPredictorEntries: Array<IdbPredictorEntry>): { newEntries: Array<any>, existingEntries: Array<any> } {
    let newEntries: Array<any> = new Array();
    let existingEntries: Array<any> = new Array();

    fileData.forEach(dataElement => {
      let existingEntry: IdbPredictorEntry = this.getExistingEntry(new Date(dataElement['Date']), facilityPredictorEntries);
      if (existingEntry) {
        existingEntries.push(dataElement);
      } else {
        newEntries.push(dataElement);
      }
    });

    return {
      newEntries: newEntries,
      existingEntries: existingEntries
    }

  }


  getExistingEntry(elementDate: Date, facilityPredictorEntries: Array<IdbPredictorEntry>): IdbPredictorEntry {
    let checkExists: IdbPredictorEntry = facilityPredictorEntries.find(entry => {
      let entryDate: Date = new Date(entry.date);
      return (entryDate.getUTCFullYear() == elementDate.getUTCFullYear() && entryDate.getUTCMonth() == elementDate.getUTCMonth());
    });
    return checkExists;
  }

}


export interface ImportPredictorFileSummary {
  existingPredictors: Array<PredictorData>;
  newPredictors: Array<PredictorData>;
  existingPredictorEntries: Array<any>;
  newPredictorEntries: Array<any>;
}
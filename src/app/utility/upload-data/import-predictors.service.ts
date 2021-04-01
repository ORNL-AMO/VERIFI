import { Injectable } from '@angular/core';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { IdbPredictorEntry, PredictorData } from 'src/app/models/idb';
import { ColumnItem } from './excel-wizard/excel-wizard.service';

@Injectable({
  providedIn: 'root'
})
export class ImportPredictorsService {

  constructor(private predictorsDbService: PredictordbService) { }

  getSummaryFromTemplatesFile(fileData: Array<any>, predictorHeaders: Array<string>, facilityPredictors: Array<PredictorData>, facilityPredictorEntries: Array<IdbPredictorEntry>): ImportPredictorFileSummary {
    let existingPredictors: Array<PredictorData> = new Array();
    let newPredictors: Array<PredictorData> = new Array();
    predictorHeaders.forEach(header => {
      if (header != 'Date') {
        //possibly use "includes" instead of == for check
        let headerExists: PredictorData = facilityPredictors.find(predictor => { return predictor.name == header });
        if (headerExists) {
          headerExists.importWizardName = header;
          existingPredictors.push(headerExists);
        } else {
          let newPredictor: PredictorData = this.predictorsDbService.getNewPredictor(facilityPredictors);
          newPredictor.name = header;
          newPredictor.importWizardName = header;
          newPredictors.push(newPredictor);
        }
      }
    });

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


  getPredictorsSummaryFromExcelFile(groupItems: Array<ColumnItem>, fileData: Array<any>, facilityPredictorEntries: Array<IdbPredictorEntry>): ImportPredictorFileSummary {
    let facilityPredictors: Array<PredictorData> = this.predictorsDbService.facilityPredictors.getValue();
    let existingPredictors: Array<PredictorData> = new Array();
    let newPredictors: Array<PredictorData> = new Array();
    groupItems.forEach(item => {
      let itemExist: PredictorData = facilityPredictors.find(predictor => { return predictor.name == item.value });
      if (itemExist) {
        itemExist.importWizardName = item.value;
        existingPredictors.push(itemExist);
      } else {
        let newPredictor: PredictorData = this.predictorsDbService.getNewPredictor(facilityPredictors);
        newPredictor.name = item.value;
        newPredictor.importWizardName = item.value;
        newPredictors.push(newPredictor);
      }
    });

    let splitData: { newEntries: Array<any>, existingEntries: Array<any> } = this.splitExistingAndNewEntries(fileData, facilityPredictorEntries);

    return {
      existingPredictors: existingPredictors,
      newPredictors: newPredictors,
      newPredictorEntries: splitData.newEntries,
      existingPredictorEntries: splitData.existingEntries
    };
  }

}


export interface ImportPredictorFileSummary {
  existingPredictors: Array<PredictorData>;
  newPredictors: Array<PredictorData>;
  existingPredictorEntries: Array<any>;
  newPredictorEntries: Array<any>;
}
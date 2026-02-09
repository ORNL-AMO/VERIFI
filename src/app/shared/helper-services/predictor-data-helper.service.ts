import { Injectable } from '@angular/core';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import * as _ from 'lodash';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { checkSameMonth } from 'src/app/data-management/data-management-import/import-services/upload-helper-functions';
import { getDateFromMeterData, getDateFromPredictorData, getEarliestMeterData, getLatestMeterData, getLatestPredictorData } from '../dateHelperFunctions';

@Injectable({
  providedIn: 'root'
})
export class PredictorDataHelperService {

  constructor(private predictorDbService: PredictorDbService, private predictorDataDbService: PredictorDataDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
  ) { }

  checkWeatherPredictorsNeedUpdate(facility: IdbFacility, facilityPredictors?: Array<IdbPredictor>): Array<{ predictor: IdbPredictor, latestReadingDate: Date }> {
    if (!facilityPredictors) {
      facilityPredictors = this.predictorDbService.getByFacilityId(facility.guid);
    }
    let lastReadingDate: Date = this.getLastMeterDate(facility);
    if (lastReadingDate) {
      let predictorsNeedUpdate: Array<{ predictor: IdbPredictor, latestReadingDate: Date }> = new Array();
      facilityPredictors.forEach(predictor => {
        let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByPredictorId(predictor.guid);
        if (predictorData.length > 0) {
          let predictorDate: Date = this.getLastPredictorReadingDate(predictor);
          if (predictorDate < lastReadingDate && checkSameMonth(predictorDate, lastReadingDate) == false) {
            predictorsNeedUpdate.push({ predictor: predictor, latestReadingDate: predictorDate });
          }
        } else {
          predictorsNeedUpdate.push({ predictor: predictor, latestReadingDate: undefined });
        }
      });
      return predictorsNeedUpdate;
    }
    return [];
  }

  getLastPredictorReadingDate(predictor: IdbPredictor): Date {
    let predictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByPredictorId(predictor.guid);
    let latestPredictorData: IdbPredictorData = getLatestPredictorData(predictorData);
    if (latestPredictorData) {
      let predictorDate: Date = getDateFromPredictorData(latestPredictorData);
      return predictorDate;
    }
    return undefined;
  }

  getLastMeterDate(facility: IdbFacility): Date {
    let utilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(facility.guid);
    let latestMeterData: IdbUtilityMeterData = getLatestMeterData(utilityMeterData);
    if (latestMeterData) {
      return getDateFromMeterData(latestMeterData);
    }
    return;
  }

  getFirstMeterDate(facility: IdbFacility): Date {
    let utilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(facility.guid);
    let firstMeterData: IdbUtilityMeterData = getEarliestMeterData(utilityMeterData);
    if (firstMeterData) {
      return getDateFromMeterData(firstMeterData);
    }
    return;
  }


  getPredictorTableItem(predictor: IdbPredictor, predictorsNeedUpdate: Array<{ predictor: IdbPredictor, latestReadingDate: Date }>): PredictorTableItem {
    let needsUpdate = predictorsNeedUpdate.find(needsUpdatePredictor => {
      return needsUpdatePredictor.predictor.guid == predictor.guid;
    });
    let tableItem: PredictorTableItem;
    if (!needsUpdate) {
      let latestReadingDate: Date = this.getLastPredictorReadingDate(predictor);
      tableItem = {
        needsUpdate: false,
        latestReadingDate: latestReadingDate,
        predictor: predictor
      }
    } else {
      tableItem = {
        needsUpdate: true,
        latestReadingDate: needsUpdate.latestReadingDate,
        predictor: predictor
      }
    }
    return tableItem;
  }
}



export interface PredictorTableItem { predictor: IdbPredictor, latestReadingDate: Date, needsUpdate: boolean }
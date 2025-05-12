import { Injectable } from '@angular/core';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import * as _ from 'lodash';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { checkSameMonth } from 'src/app/upload-data/upload-helper-functions';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Injectable({
  providedIn: 'root'
})
export class PredictorDataHelperService {

  constructor(private predictorDbService: PredictorDbService, private predictorDataDbService: PredictorDataDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private accountDbService: AccountdbService
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
    let latestPredictorData: IdbPredictorData = _.maxBy(predictorData, (pData: IdbPredictorData) => {
      return new Date(pData.date);
    })
    if (latestPredictorData) {
      let predictorDate: Date = new Date(latestPredictorData.date);
      return predictorDate;
    }
    return undefined;
  }

  getLastMeterDate(facility: IdbFacility): Date {
    let utilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(facility.guid);
    let utilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(facility.guid);
    let filteredMeters: Array<IdbUtilityMeter> = utilityMeters.filter(meter => {
      return meter.meterReadingDataApplication != 'fullYear';
    });
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(filteredMeters, utilityMeterData, facility, true, { energyIsSource: facility.energyIsSource, neededUnits: undefined }, [], [], [facility], account.assessmentReportVersion);
    let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(cMeter => {
      return cMeter.monthlyData;
    });
    let lastReading: MonthlyData = _.maxBy(monthlyData, (cMeter: MonthlyData) => {
      return new Date(cMeter.date);
    });
    if (lastReading) {
      return new Date(lastReading.date);
    }
    return;
  }

  getFirstMeterDate(facility: IdbFacility): Date {
    let utilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(facility.guid);
    let utilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(facility.guid);
    let filteredMeters: Array<IdbUtilityMeter> = utilityMeters.filter(meter => {
      return meter.meterReadingDataApplication != 'fullYear';
    });
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(filteredMeters, utilityMeterData, facility, true, { energyIsSource: facility.energyIsSource, neededUnits: undefined }, [], [], [facility], account.assessmentReportVersion);
    let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(cMeter => {
      return cMeter.monthlyData;
    });
    let lastReading: MonthlyData = _.minBy(monthlyData, (cMeter: MonthlyData) => {
      return new Date(cMeter.date);
    });
    if (lastReading) {
      return new Date(lastReading.date);
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
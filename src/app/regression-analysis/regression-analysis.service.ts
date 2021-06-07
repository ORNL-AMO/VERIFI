import { Injectable } from '@angular/core';
import { PredictordbService } from '../indexedDB/predictors-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { CalanderizedMeter, MonthlyData } from '../models/calanderization';
import { IdbPredictorEntry, IdbUtilityMeter, PredictorData } from '../models/idb';
import { CalanderizationService } from '../shared/helper-services/calanderization.service';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class RegressionAnalysisService {

  constructor(private predictorDbService: PredictordbService, private utilityMeterDbService: UtilityMeterdbService,
    private calanderizationService: CalanderizationService) { }

  getRegressionTableData(): Array<RegressionTableRow> {
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let facilityPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    let facilityPredictors: Array<PredictorData> = this.predictorDbService.facilityPredictors.getValue();
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(facilityMeters, false);
    let lastBillEntry: MonthlyData = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData);
    let firstBillEntry: MonthlyData = this.calanderizationService.getFirstBillEntryFromCalanderizedMeterData(calanderizedMeterData);

    let lastPredictorEntry: IdbPredictorEntry = _.maxBy(facilityPredictorEntries, (data: IdbPredictorEntry) => {
      let date: Date = new Date(data.date);
      return date;
    });

    let firstPredictorEntry: IdbPredictorEntry = _.minBy(facilityPredictorEntries, (data: IdbPredictorEntry) => {
      let date: Date = new Date(data.date);
      return date;
    });

    let endDate: Date = this.getLastDate(lastBillEntry, lastPredictorEntry);
    let startDate: Date = this.getLastDate(firstBillEntry, firstPredictorEntry);
    let regressionTableRows: Array<RegressionTableRow> = new Array();
    if (startDate && endDate) {
      while (startDate < endDate) {

        let rowData: Array<{ label: string, isMeter: boolean, value: number }> = new Array();

        calanderizedMeterData.forEach(calanderizedMeter => {
          let meterData: MonthlyData = calanderizedMeter.monthlyData.find(dataItem => {
            return (dataItem.monthNumValue == startDate.getUTCMonth() && dataItem.year == startDate.getUTCFullYear());
          });
          let data: { label: string, isMeter: boolean, value: number } = {
            label: calanderizedMeter.meter.name,
            isMeter: true,
            value: 0
          }
          if (meterData) {
            data.value = meterData.energyUse;
          }
          rowData.push(data);
        });

        facilityPredictors.forEach(predictor => {
          let facilityPredictor: IdbPredictorEntry = facilityPredictorEntries.find(dataItem => {
            let dataItemDate: Date = new Date(dataItem.date);
            return (dataItemDate.getUTCMonth() == startDate.getUTCMonth() && dataItemDate.getUTCFullYear() == startDate.getUTCFullYear());
          });
          let data: { label: string, isMeter: boolean, value: number } = {
            label: predictor.name,
            isMeter: false,
            value: 0
          }
          if (facilityPredictor) {
            let predictorData: PredictorData = facilityPredictor.predictors.find(predictorEntry => { return predictorEntry.id == predictor.id });
            if (predictorData.amount) {
              data.value = predictorData.amount;
            }
            rowData.push(data);
          }
        });
        regressionTableRows.push({
          date: new Date(startDate),
          data: rowData
        });
        startDate.setMonth(startDate.getMonth() + 1)
      }
    }
    return regressionTableRows;
  }


  getLastDate(monthlyData?: MonthlyData, predictorEntry?: IdbPredictorEntry): Date {
    let lastDate: Date;
    if (monthlyData && predictorEntry) {
      lastDate = _.max([new Date(monthlyData.date), new Date(predictorEntry.date)]);
    } else if (monthlyData) {
      lastDate = new Date(monthlyData.date);
    } else if (predictorEntry) {
      lastDate = new Date(predictorEntry.date);
    }
    return lastDate;
  }
}


export interface RegressionTableRow {
  date: Date,
  data: Array<{
    label: string,
    isMeter: boolean,
    value: number
  }>
}
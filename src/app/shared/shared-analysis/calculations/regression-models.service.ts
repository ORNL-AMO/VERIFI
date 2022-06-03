import { Injectable } from '@angular/core';
import * as jStat from 'jstat';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { JStatRegressionModel } from 'src/app/models/analysis';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, PredictorData } from 'src/app/models/idb';
import { AnalysisCalculationsHelperService } from './analysis-calculations-helper.service';
import * as _ from 'lodash';
@Injectable({
  providedIn: 'root'
})
export class RegressionModelsService {

  allResults: Array<Array<number>>;
  constructor(private analysisCalculationsHelperService: AnalysisCalculationsHelperService, private predictorDbService: PredictordbService) { }

  test() {
    // var A = [[1, 2, 3],
    // [1, 1, 0],
    // [1, -2, 3],
    // [1, 3, 4],
    // [1, -10, 2],
    // [1, 4, 4],
    // [1, 10, 2],
    // [1, 3, 2],
    // [1, 4, -1]];
    // var b = [1, -2, 3, 4, -5, 6, 7, -8, 9];

    var A = [[1, 1394],
    [1, 1125],
    [1, 1164],
    [1, 1287],
    [1, 1161],
    [1, 991],
    [1, 1078],
    [1, 1136],
    [1, 972],
    [1, 1215],
    [1, 1005],
    [1, 1087]
    ]

    var b = [3755.830381423515,
      3197.5862290367977,
      3399.46675896127,
      3233.961309603572,
      3392.2102967505684,
      3434.8330758440275,
      3701.3038042615,
      3592.4381061511776,
      3201.3656781735567,
      3132.9828341189295,
      3096.691299316677,
      3248.523027281516
    ]

    var model = jStat.models.ols(b, A);
    console.log(model);
    // coefficient estimated
    console.log('coef')
    console.log(model.coef) // -> [0.662197222856431, 0.5855663255775336, 0.013512111085743017]

    // R2
    console.log('R2')
    console.log(model.R2) // -> 0.309

    // t test P-value
    console.log('t test P-value')
    console.log(model.t.p) // -> [0.8377444317889267, 0.15296736158442314, 0.9909627983826583]

    // f test P-value
    console.log('f test P-value')
    console.log(model.f.pvalue) // -> 0.3306363671859872
  }


  getModels(analysisGroup: AnalysisGroup, calanderizedMeters: Array<CalanderizedMeter>, facility: IdbFacility, analysisItem: IdbAnalysisItem): Array<JStatRegressionModel> {
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
    let endDate: Date = monthlyStartAndEndDate.endDate;
    let reportYear: number = analysisItem.reportYear;
    let baselineYear: number = this.analysisCalculationsHelperService.getFiscalYear(baselineDate, facility);
    if (facility.fiscalYear == 'nonCalendarYear' && facility.fiscalYearCalendarEnd) {
      baselineYear = baselineYear - 1;
      reportYear = reportYear - 1;
    }
    let predictorVariables: Array<PredictorData> = new Array();
    let predictorVariableIds: Array<string> = new Array();
    analysisGroup.predictorVariables.forEach(variable => {
      if (variable.productionInAnalysis) {
        predictorVariables.push(variable);
        predictorVariableIds.push(variable.id);
      }
    });
    let allPredictorVariableCombos: Array<Array<string>> = this.getPredictorCombos(predictorVariableIds);
    console.log(allPredictorVariableCombos);

    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let facilityPredictorData: Array<IdbPredictorEntry> = accountPredictorEntries.filter(entry => {
      return entry.facilityId == facility.guid;
    });

    let groupMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.groupId == analysisGroup.idbGroupId });
    let allMeterData: Array<MonthlyData> = groupMeters.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });

    let models: Array<JStatRegressionModel> = new Array();
    while (baselineYear <= reportYear) {
      let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.getMonthlyStartAndEndDate(facility, baselineYear);
      console.log(monthlyStartAndEndDate.baselineDate);
      allPredictorVariableCombos.forEach(variableIdCombo => {
        let regressionData: { endog: Array<number>, exog: Array<Array<number>> } = this.getRegressionData(monthlyStartAndEndDate.baselineDate, monthlyStartAndEndDate.endDate, allMeterData, facilityPredictorData, variableIdCombo);
        console.log(regressionData.exog);

        let model: JStatRegressionModel = jStat.models.ols(regressionData.endog, regressionData.exog);
        model['modelYear'] = baselineYear;
        let modelPredictorVariables: Array<PredictorData> = new Array();
        variableIdCombo.forEach(variableId => {
          let variable: PredictorData = predictorVariables.find(variable => { return variable.id == variableId });
          modelPredictorVariables.push(variable);
        });
        model['predictorVariables'] = modelPredictorVariables;
        model['isValid'] = this.checkModelValid(model);
        model['modelId'] = Math.random().toString(36).substr(2, 9);
        models.push(model);
      })

      baselineYear++;
    }
    return models;
  }

  getRegressionData(startDate: Date, endDate: Date, allMeterData: Array<MonthlyData>, facilityPredictorData: Array<IdbPredictorEntry>, predictorVariablesIds: Array<string>): { endog: Array<number>, exog: Array<Array<number>> } {
    let endog: Array<number> = new Array();
    let exog: Array<Array<number>> = new Array();
    while (startDate < endDate) {
      let monthData: Array<MonthlyData> = allMeterData.filter(data => {
        let dataDate: Date = new Date(data.date);
        return dataDate.getUTCMonth() == startDate.getUTCMonth() && dataDate.getUTCFullYear() == startDate.getUTCFullYear();
      });
      let energyUse: number = _.sumBy(monthData, 'energyUse');
      endog.push(energyUse);
      let monthPredictorData: Array<IdbPredictorEntry> = facilityPredictorData.filter(pData => {
        let dataDate: Date = new Date(pData.date);
        return dataDate.getUTCMonth() == startDate.getUTCMonth() && dataDate.getUTCFullYear() == startDate.getUTCFullYear();
      });

      //need 1 for constants
      let usageArr: Array<number> = [1];
      predictorVariablesIds.forEach(variableId => {
        let totalUsage: number = 0;
        monthPredictorData.forEach(pData => {
          let predictorUsage = pData.predictors.find(predictor => { return predictor.id == variableId });
          totalUsage = totalUsage + predictorUsage.amount;
        });
        usageArr.push(totalUsage);
      });
      exog.push(usageArr);
      let currentMonth: number = startDate.getUTCMonth()
      let nextMonth: number = currentMonth + 1;
      startDate = new Date(startDate.getUTCFullYear(), nextMonth, 1);
    }

    return {
      endog: endog,
      exog: exog
    }
  }

  getMonthlyStartAndEndDate(facilityOrAccount: IdbFacility, startYear: number): { baselineDate: Date, endDate: Date } {
    let baselineDate: Date;
    let endDate: Date;
    if (facilityOrAccount.fiscalYear == 'calendarYear') {
      baselineDate = new Date(startYear, 0, 1);
      endDate = new Date(startYear + 1, 0, 1);
    } else {
      if (facilityOrAccount.fiscalYearCalendarEnd) {
        baselineDate = new Date(startYear - 1, facilityOrAccount.fiscalYearMonth);
        endDate = new Date(startYear, facilityOrAccount.fiscalYearMonth);
      } else {
        baselineDate = new Date(startYear, facilityOrAccount.fiscalYearMonth);
        endDate = new Date(startYear + 1, facilityOrAccount.fiscalYearMonth);
      }
    }
    return {
      baselineDate: baselineDate,
      endDate: endDate
    }
  }

  checkModelValid(model: JStatRegressionModel): boolean {
    let isValid: boolean = true;
    if (model.f.pvalue > .1) {
      isValid = false;
    } else if (model.t.p.find(val => { return val > .2 })) {
      isValid = false;
    } else if (!model.t.p.find(val => { return val < .1 })) {
      isValid = false;
    } else if (model.R2 < .5) {
      isValid = false;
    }
    return isValid;
  }


  // getCombonations(predictorVariables: Array<PredictorData>): Array<Array<PredictorData>>{

  //   let combos: Array<Array<PredictorData>> = new Array();
  //   for(let i = 0; i < predictorVariables.length; i++){
  //     let pCombos: Array<PredictorData> = new Array();
  //     pCombos.push(predictorVariables[i]);
  //   }
  // }

  // getAllCombos(predictorVariables: Array<PredictorData>): Array<Array<PredictorData>>{
  //   for(let i = 0; i < predictorVariables.length; i++){
  //     let pCombos: Array<PredictorData> = new Array();
  //     pCombos.push(predictorVariables[i]);
  //   }
  // }


  getPredictorCombos(predictorIds: Array<string>): Array<Array<string>> {
    let allCombos: Array<Array<string>> = [];
    for (let i = 1; i < 5; i++) {
      this.getCombinations(predictorIds, i, allCombos);
    }
    return allCombos;
  }

  getCombinations(values: Array<string>, size: number, allResults: Array<Array<string>>) {
    let result = new Array(size);
    this.combinations(values, size, 0, result, allResults);
    console.log(allResults);

  }

  combinations(values: Array<string>, size: number, startPosition: number, result: Array<string>, allResults: Array<Array<string>>) {
    if (size == 0) {
      console.log(result);
      allResults.push(JSON.parse(JSON.stringify(result)));
      return;
    }
    for (let i = startPosition; i <= values.length - size; i++) {
      result[result.length - size] = values[i];
      this.combinations(values, size - 1, i + 1, result, allResults);
    }
  }

}

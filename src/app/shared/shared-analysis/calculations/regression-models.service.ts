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

  getModels(analysisGroup: AnalysisGroup, calanderizedMeters: Array<CalanderizedMeter>, facility: IdbFacility, analysisItem: IdbAnalysisItem): Array<JStatRegressionModel> {
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
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
    if (predictorVariableIds.length != 0) {
      let allPredictorVariableCombos: Array<Array<string>> = this.getPredictorCombos(predictorVariableIds);

      let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
      let facilityPredictorData: Array<IdbPredictorEntry> = accountPredictorEntries.filter(entry => {
        return entry.facilityId == facility.guid;
      });

      let groupMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.groupId == analysisGroup.idbGroupId });
      let allMeterData: Array<MonthlyData> = groupMeters.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });

      let models: Array<JStatRegressionModel> = new Array();
      while (baselineYear <= reportYear) {
        let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.getMonthlyStartAndEndDate(facility, baselineYear);
        allPredictorVariableCombos.forEach(variableIdCombo => {
          let regressionData: { endog: Array<number>, exog: Array<Array<number>> } = this.getRegressionData(monthlyStartAndEndDate.baselineDate, monthlyStartAndEndDate.endDate, allMeterData, facilityPredictorData, variableIdCombo);
          try {
            let model: JStatRegressionModel = jStat.models.ols(regressionData.endog, regressionData.exog);
            model['modelYear'] = baselineYear;
            let modelPredictorVariables: Array<PredictorData> = new Array();
            variableIdCombo.forEach(variableId => {
              let variable: PredictorData = predictorVariables.find(variable => { return variable.id == variableId });
              modelPredictorVariables.push(variable);
            });
            model['predictorVariables'] = modelPredictorVariables;
            // model['isValid'] = this.checkModelValid(model);
            model = this.setModelVaildAndNotes(model);
            model['modelId'] = Math.random().toString(36).substr(2, 9);
            model['modelPValue'] = model.f.pvalue;
            model['errorModeling'] = false;
            models.push(model);
          } catch (err) {
            console.log(err);
            let modelPredictorVariables: Array<PredictorData> = new Array();
            variableIdCombo.forEach(variableId => {
              let variable: PredictorData = predictorVariables.find(variable => { return variable.id == variableId });
              modelPredictorVariables.push(variable);
            });
            models.push({
              coef: [],
              R2: undefined,
              SSE: undefined,
              SSR: undefined,
              SST: undefined,
              adjust_R2: undefined,
              df_model: undefined,
              df_resid: undefined,
              ybar: undefined,
              t: {
                se: [],
                sigmaHat: undefined,
                p: []
              },
              f: {
                pvalue: undefined,
                F_statistic: undefined
              },
              modelYear: baselineYear,
              predictorVariables: modelPredictorVariables,
              modelId: undefined,
              isValid: false,
              modelPValue: undefined,
              modelNotes: ['Model could not be calculated.'],
              errorModeling: true
            })
          }
        })

        baselineYear++;
      }
      return models;
    } else {
      return;
    }
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

  setModelVaildAndNotes(model: JStatRegressionModel): JStatRegressionModel {
    let modelNotes: Array<string> = new Array();
    model['isValid'] = true;

    model.coef.forEach((coef, index) => {
      if (coef < 0) {
        if (index == 0) {
          modelNotes.push('Intercept is < 0')
        } else {
          modelNotes.push(model.predictorVariables[index - 1].name + ' coef < 0');
        }
      }
    })

    if (model.f.pvalue > .1) {
      model['isValid'] = false;
      modelNotes.push('Model p-Value > .1');
    }

    model.t.p.forEach((val, index) => {
      if (val > .2) {
        if (index != 0) {
          modelNotes.push(model.predictorVariables[index - 1].name + ' p-Value > .2')
        }
        model['isValid'] = false;
      }
    })

    if (!model.t.p.find(val => { return val < .1 })) {
      model['isValid'] = false;
      modelNotes.push('No variable p-Value < 0.1')
    }

    if (model.R2 < .5) {
      model['isValid'] = false;
      modelNotes.push('R2 < .5');
    }

    if (model.adjust_R2 < .5) {
      modelNotes.push('Adjusted R2 < .5');
    }

    let productionVariable: PredictorData = model.predictorVariables.find(variable => { return variable.production });
    if (!productionVariable) {
      modelNotes.push('No production variable in model');
    }
    model['modelNotes'] = modelNotes;
    return model;
  }

  getPredictorCombos(predictorIds: Array<string>): Array<Array<string>> {
    let allCombos: Array<Array<string>> = [];
    for (let i = 1; i < 5; i++) {
      this.getCombinations(predictorIds, i, allCombos);
    }
    return allCombos;
  }

  getCombinations(values: Array<string>, size: number, allCombos: Array<Array<string>>) {
    let result = new Array(size);
    this.combinations(values, size, 0, result, allCombos);
  }

  combinations(values: Array<string>, size: number, startPosition: number, result: Array<string>, allCombos: Array<Array<string>>) {
    if (size == 0) {
      allCombos.push(JSON.parse(JSON.stringify(result)));
      return;
    }
    for (let i = startPosition; i <= values.length - size; i++) {
      result[result.length - size] = values[i];
      this.combinations(values, size - 1, i + 1, result, allCombos);
    }
  }

}

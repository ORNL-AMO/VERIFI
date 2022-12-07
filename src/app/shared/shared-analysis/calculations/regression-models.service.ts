import { Injectable } from '@angular/core';
import * as jStat from 'jstat';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { JStatRegressionModel, SEPValidation } from 'src/app/models/analysis';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, PredictorData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { getFiscalYear } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { getMonthlyStartAndEndDate } from 'src/app/calculations/shared-calculations/calculationsHelpers';
@Injectable({
  providedIn: 'root'
})
export class RegressionModelsService {

  allResults: Array<Array<number>>;
  constructor(private predictorDbService: PredictordbService) { }

  getModels(analysisGroup: AnalysisGroup, calanderizedMeters: Array<CalanderizedMeter>, facility: IdbFacility, analysisItem: IdbAnalysisItem): Array<JStatRegressionModel> {
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
    let reportYear: number = analysisItem.reportYear;
    let baselineYear: number = getFiscalYear(baselineDate, facility);
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
        let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.getModelMonthlyStartAndEndDate(facility, baselineYear);
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
            model = this.setModelVaildAndNotes(model, facilityPredictorData, reportYear, facility);
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

  getModelMonthlyStartAndEndDate(facilityOrAccount: IdbFacility, startYear: number): { baselineDate: Date, endDate: Date } {
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

  setModelVaildAndNotes(model: JStatRegressionModel, facilityPredictorData: Array<IdbPredictorEntry>, reportYear: number, facility: IdbFacility): JStatRegressionModel {
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
    });

    if (model.f.pvalue > .1) {
      model['isValid'] = false;
      modelNotes.push('Model p-Value > .1');
    }

    model.t.p.forEach((val, index) => {
      if (val > .2 && index != 0) {
        modelNotes.push(model.predictorVariables[index - 1].name + ' p-Value > .2')
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

    let validationCheck: { SEPNotes: Array<string>, SEPValidation: Array<SEPValidation> } = this.checkSEPNotes(model, facilityPredictorData, reportYear, facility);
    validationCheck.SEPNotes.forEach(note => {
      modelNotes.push(note);
    });
    model['SEPValidation'] = validationCheck.SEPValidation;
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


  checkSEPNotes(model: JStatRegressionModel, facilityPredictorData: Array<IdbPredictorEntry>, reportYear: number, facility: IdbFacility): { SEPNotes: Array<string>, SEPValidation: Array<SEPValidation> } {
    let SEPNotes: Array<string> = new Array();
    let SEPValidation: Array<SEPValidation> = new Array();
    let modelPredictorData: Array<IdbPredictorEntry> = new Array();
    let reportYearPredictorData: Array<IdbPredictorEntry> = new Array();
    let baselineYearPredictorData: Array<IdbPredictorEntry> = new Array();
    for (let i = 0; i < facilityPredictorData.length; i++) {
      let fiscalYear: number = getFiscalYear(facilityPredictorData[i].date, facility);
      if (fiscalYear == reportYear) {
        reportYearPredictorData.push(facilityPredictorData[i]);
      }
      if (fiscalYear == model.modelYear) {
        modelPredictorData.push(facilityPredictorData[i])
      }
      if (fiscalYear == facility.sustainabilityQuestions.energyReductionBaselineYear) {
        baselineYearPredictorData.push(facilityPredictorData[i]);
      }
    }


    model.predictorVariables.forEach(variable => {
      let modelMinValid: boolean = true;
      let modelMaxValid: boolean = true;
      let modelPlus3StdDevValid: boolean = true;
      let modelMinus3StdDevValid: boolean = true;


      let variableNotes: Array<string> = new Array();
      let variableValid: boolean = true;
      let modelYearUsage: Array<number> = modelPredictorData.map(data => {
        let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
        return predictorData.amount;
      });
      let modelMin: number = _.min(modelYearUsage);
      let modelMax: number = _.max(modelYearUsage);

      let modelAvg: number = _.mean(modelYearUsage);
      let reportYearUsage: Array<number> = reportYearPredictorData.map(data => {
        let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
        return predictorData.amount;
      });
      let reportAvg: number = _.mean(reportYearUsage);

      let baselineYearUsage: Array<number> = baselineYearPredictorData.map(data => {
        let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
        return predictorData.amount;
      });

      let baselineAvg: number = _.mean(baselineYearUsage);

      if (modelMax < reportAvg || reportAvg < modelMin || modelMax < baselineAvg || baselineAvg < modelMin) {
        variableValid = false;
        if (modelMax < reportAvg) {
          modelMaxValid = false;
          variableNotes.push(variable.name + ' mean for the report year is greater than model year max.');
        }
        if (reportAvg < modelMin) {
          modelMinValid = false;
          variableNotes.push(variable.name + ' mean for the report year is less than model year min.');
        }

        if (modelMax < baselineAvg) {
          modelMaxValid = false;
          variableNotes.push(variable.name + ' mean for the baseline year is greater than model year max.');
        }
        if (baselineAvg < modelMin) {
          modelMinValid = false;
          variableNotes.push(variable.name + ' mean for the baseline year is less than model year min.');
        }

      }

      let sumSquare: number = 0;
      modelYearUsage.forEach(usage => {
        sumSquare = sumSquare + ((usage - modelAvg) * (usage - modelAvg));
      });

      let modelStandardDev: number = Math.sqrt((sumSquare / (modelYearUsage.length - 1)));
      let standardMax: number = modelAvg + (3 * modelStandardDev);
      let standardMin: number = modelAvg - (3 * modelStandardDev);

      if (standardMax < reportAvg || standardMin > reportAvg || standardMax < baselineAvg || standardMin > baselineAvg) {
        variableValid = false;
        if (standardMax < reportAvg) {
          modelPlus3StdDevValid = false;
          variableNotes.push(variable.name + ' mean for report year is greater than 3 standard deviations from model year mean.');
        }
        if (standardMin > reportAvg) {
          modelMinus3StdDevValid = false
          variableNotes.push(variable.name + ' mean for the report year is less than 3 standard deviations from model year mean.');
        }
        if (standardMax < baselineAvg) {
          modelPlus3StdDevValid = false;
          variableNotes.push(variable.name + ' mean for baseline year is greater than 3 standard deviations from model year mean.');
        }
        if (standardMin > baselineAvg) {
          modelMinus3StdDevValid = false
          variableNotes.push(variable.name + ' mean for the baseline year is less than 3 standard deviations from model year mean.');
        }
      } else {
        variableValid = true;
      }

      SEPValidation.push({
        predictorVariable: variable.name,
        meanReportYear: reportAvg,
        meanBaselineYear: baselineAvg,
        modelMin: modelMin,
        modelMinValid: modelMinValid,
        modelMax: modelMax,
        modelMaxValid: modelMaxValid,
        modelPlus3StdDev: standardMax,
        modelPlus3StdDevValid: modelPlus3StdDevValid,
        modelMinus3StdDev: standardMin,
        modelMinus3StdDevValid: modelMinus3StdDevValid,
        isValid: variableValid
      })

      if (variableValid == false) {
        variableNotes.forEach(note => {
          SEPNotes.push(note);
        })
      }
    });
    return {
      SEPNotes: SEPNotes,
      SEPValidation: SEPValidation
    };
  }

}

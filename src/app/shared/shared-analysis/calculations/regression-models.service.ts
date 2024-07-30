import { Injectable } from '@angular/core';
import * as jStat from 'jstat';
import { AnalysisGroup, AnalysisGroupPredictorVariable, JStatRegressionModel, SEPValidation } from 'src/app/models/analysis';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import * as _ from 'lodash';
import { getFiscalYear } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { getMonthlyStartAndEndDate } from 'src/app/calculations/shared-calculations/calculationsHelpers';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
@Injectable({
  providedIn: 'root'
})
export class RegressionModelsService {

  allResults: Array<Array<number>>;
  constructor(private predictorDataDbService: PredictorDataDbService) { }

  getModels(analysisGroup: AnalysisGroup, calanderizedMeters: Array<CalanderizedMeter>, facility: IdbFacility, analysisItem: IdbAnalysisItem): Array<JStatRegressionModel> {
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
    let reportYear: number = analysisItem.reportYear;
    let baselineYear: number = getFiscalYear(baselineDate, facility);
    let predictorVariables: Array<AnalysisGroupPredictorVariable> = new Array();
    let predictorVariableIds: Array<string> = new Array();
    analysisGroup.predictorVariables.forEach(variable => {
      if (variable.productionInAnalysis) {
        predictorVariables.push(variable);
        predictorVariableIds.push(variable.id);
      }
    });
    if (predictorVariableIds.length != 0) {
      let allPredictorVariableCombos: Array<Array<string>> = this.getPredictorCombos(predictorVariableIds, analysisGroup.maxModelVariables);
      let facilityPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByFacilityId(facility.guid);
      let groupMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.groupId == analysisGroup.idbGroupId });
      let allMeterData: Array<MonthlyData> = groupMeters.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });

      let models: Array<JStatRegressionModel> = new Array();
      let startYear: number = getFiscalYear(baselineDate, facility);
      while (startYear <= reportYear) {
        let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.getModelMonthlyStartAndEndDate(facility, startYear);
        allPredictorVariableCombos.forEach(variableIdCombo => {
          let regressionData: { endog: Array<number>, exog: Array<Array<number>> } = this.getRegressionData(monthlyStartAndEndDate.baselineDate, monthlyStartAndEndDate.endDate, allMeterData, facilityPredictorData, variableIdCombo, analysisItem.analysisCategory);
          try {
            let model: JStatRegressionModel = jStat.models.ols(regressionData.endog, regressionData.exog);
            model['modelYear'] = startYear;
            let modelPredictorVariables: Array<AnalysisGroupPredictorVariable> = new Array();
            variableIdCombo.forEach(variableId => {
              let variable: AnalysisGroupPredictorVariable = predictorVariables.find(variable => { return variable.id == variableId });
              modelPredictorVariables.push(variable);
            });
            model['predictorVariables'] = modelPredictorVariables;
            model = this.setModelVaildAndNotes(model, facilityPredictorData, reportYear, facility, baselineYear);
            model['modelId'] = Math.random().toString(36).substr(2, 9);
            model['modelPValue'] = model.f.pvalue;
            model['errorModeling'] = false;
            //Remove unused JSTAT data from model
            let jstatModelToSave: JStatRegressionModel = {
              coef: model.coef,
              R2: model.R2,
              SSE: model.SSE,
              SSR: model.SSR,
              SST: model.SST,
              adjust_R2: model.adjust_R2,
              df_model: model.df_model,
              df_resid: model.df_resid,
              ybar: model.ybar,
              t: {
                se: model.t.se,
                sigmaHat: model.t.sigmaHat,
                p: model.t.p
              },
              f: {
                pvalue: model.f.pvalue,
                F_statistic: model.f.F_statistic
              },
              modelYear: model.modelYear,
              predictorVariables: model.predictorVariables,
              modelId: model.modelId,
              isValid: model.isValid,
              modelPValue: model.modelPValue,
              modelNotes: model.modelNotes,
              errorModeling: model.errorModeling,
              SEPValidation: model.SEPValidation
            };

            models.push(jstatModelToSave);
          } catch (err) {
            console.log(err);
            let modelPredictorVariables: Array<AnalysisGroupPredictorVariable> = new Array();
            variableIdCombo.forEach(variableId => {
              let variable: AnalysisGroupPredictorVariable = predictorVariables.find(variable => { return variable.id == variableId });
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
              modelYear: startYear,
              predictorVariables: modelPredictorVariables,
              modelId: undefined,
              isValid: false,
              modelPValue: undefined,
              modelNotes: ['Model could not be calculated.'],
              errorModeling: true
            })
          }
        })

        startYear++;
      }
      return models;
    } else {
      return;
    }
  }

  getRegressionData(startDate: Date, endDate: Date, allMeterData: Array<MonthlyData>, facilityPredictorData: Array<IdbPredictorData>, predictorVariablesIds: Array<string>, analysisCategory: 'energy' | 'water'): { endog: Array<number>, exog: Array<Array<number>> } {
    let endog: Array<number> = new Array();
    let exog: Array<Array<number>> = new Array();
    while (startDate < endDate) {
      let monthData: Array<MonthlyData> = allMeterData.filter(data => {
        let dataDate: Date = new Date(data.date);
        return dataDate.getUTCMonth() == startDate.getUTCMonth() && dataDate.getUTCFullYear() == startDate.getUTCFullYear();
      });
      let energyConsumption: number;
      if (analysisCategory == 'energy') {
        energyConsumption = _.sumBy(monthData, 'energyUse');
      } else {
        energyConsumption = _.sumBy(monthData, 'energyConsumption');
      }
      endog.push(energyConsumption);
      let monthPredictorData: Array<IdbPredictorData> = facilityPredictorData.filter(pData => {
        let dataDate: Date = new Date(pData.date);
        return dataDate.getUTCMonth() == startDate.getUTCMonth() && dataDate.getUTCFullYear() == startDate.getUTCFullYear();
      });

      //need 1 for constants
      let usageArr: Array<number> = [1];
      predictorVariablesIds.forEach(variableId => {
        let variablePredictorData: Array<IdbPredictorData> = monthPredictorData.filter(pData => {
          return pData.predictorId == variableId;
        })
        let totalUsage: number = _.sumBy(variablePredictorData, (pData: IdbPredictorData) => {
          return pData.amount;
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

  setModelVaildAndNotes(model: JStatRegressionModel, facilityPredictorData: Array<IdbPredictorData>, reportYear: number, facility: IdbFacility, baselineYear: number): JStatRegressionModel {
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

    //need one p value less than .1
    let hasLessThan: boolean = false;
    model.t.p.forEach((val, index) => {
      if (val < .1 && index != 0) {
        hasLessThan = true;
      }
    });
    if (!hasLessThan) {
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

    let productionVariable: AnalysisGroupPredictorVariable = model.predictorVariables.find(variable => { return variable.production });
    if (!productionVariable) {
      modelNotes.push('No production variable in model');
    }

    let validationCheck: { SEPNotes: Array<string>, SEPValidation: Array<SEPValidation> } = this.checkSEPNotes(model, facilityPredictorData, reportYear, facility, baselineYear);
    validationCheck.SEPNotes.forEach(note => {
      modelNotes.push(note);
    });
    model['SEPValidation'] = validationCheck.SEPValidation;
    model['modelNotes'] = modelNotes;
    return model;
  }

  getPredictorCombos(predictorIds: Array<string>, maxModelVariables: number): Array<Array<string>> {
    let allCombos: Array<Array<string>> = [];
    if (!maxModelVariables) {
      maxModelVariables = 4;
    }
    for (let i = 1; i <= maxModelVariables; i++) {
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


  checkSEPNotes(model: JStatRegressionModel, facilityPredictorData: Array<IdbPredictorData>, reportYear: number, facility: IdbFacility, baselineYear: number): { SEPNotes: Array<string>, SEPValidation: Array<SEPValidation> } {
    let SEPNotes: Array<string> = new Array();
    let SEPValidation: Array<SEPValidation> = new Array();
    let modelPredictorData: Array<IdbPredictorData> = new Array();
    let reportYearPredictorData: Array<IdbPredictorData> = new Array();
    let baselineYearPredictorData: Array<IdbPredictorData> = new Array();
    for (let i = 0; i < facilityPredictorData.length; i++) {
      let fiscalYear: number = getFiscalYear(facilityPredictorData[i].date, facility);
      if (fiscalYear == reportYear) {
        reportYearPredictorData.push(facilityPredictorData[i]);
      }
      if (fiscalYear == model.modelYear) {
        modelPredictorData.push(facilityPredictorData[i])
      }
      if (fiscalYear == baselineYear) {
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
        // let predictorData: IdbPredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
        return data.amount;
      });
      let modelMin: number = _.min(modelYearUsage);
      let modelMax: number = _.max(modelYearUsage);

      let modelAvg: number = _.mean(modelYearUsage);
      let reportYearUsage: Array<number> = reportYearPredictorData.map(data => {
        // let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
        return data.amount;
      });
      let reportAvg: number = _.mean(reportYearUsage);
      let baselineYearUsage: Array<number> = baselineYearPredictorData.map(data => {
        // let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
        return data.amount;
      });
      let baselineAvg: number = _.mean(baselineYearUsage);
      let reportYearError: boolean = false;
      let baselineYearError: boolean = false;
      if (modelMax < reportAvg || reportAvg < modelMin || modelMax < baselineAvg || baselineAvg < modelMin) {
        variableValid = false;
        if (modelMax < reportAvg) {
          modelMaxValid = false;
          reportYearError = true;
          // variableNotes.push(variable.name + ' mean for the report year is greater than model year max.');
        }
        if (reportAvg < modelMin) {
          modelMinValid = false;
          reportYearError = true;
          // variableNotes.push(variable.name + ' mean for the report year is less than model year min.');
        }

        if (modelMax < baselineAvg) {
          modelMaxValid = false;
          baselineYearError = true;
          // variableNotes.push(variable.name + ' mean for the baseline year is greater than model year max.');
        }
        if (baselineAvg < modelMin) {
          modelMinValid = false;
          baselineYearError = true;
          // variableNotes.push(variable.name + ' mean for the baseline year is less than model year min.');
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
          reportYearError = true;
          // variableNotes.push(variable.name + ' mean for report year is greater than 3 standard deviations from model year mean.');
        }
        if (standardMin > reportAvg) {
          modelMinus3StdDevValid = false
          reportYearError = true;
          // variableNotes.push(variable.name + ' mean for the report year is less than 3 standard deviations from model year mean.');
        }
        if (standardMax < baselineAvg) {
          modelPlus3StdDevValid = false;
          baselineYearError = true;
          // variableNotes.push(variable.name + ' mean for baseline year is greater than 3 standard deviations from model year mean.');
        }
        if (standardMin > baselineAvg) {
          modelMinus3StdDevValid = false;
          baselineYearError = true;
          // variableNotes.push(variable.name + ' mean for the baseline year is less than 3 standard deviations from model year mean.');
        }
      } else {
        variableValid = true;
      }

      if (baselineYearError) {
        variableNotes.push(variable.name + ' failed SEP Validation for the baseline year.');
      }
      if (reportYear) {
        variableNotes.push(variable.name + ' failed SEP Validation for the report year.');
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

  updateModelReportYear(model: JStatRegressionModel, reportYear: number, facility: IdbFacility, baselineYear: number): JStatRegressionModel {
    let facilityPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.facilityPredictorData.getValue();
    model = this.setModelVaildAndNotes(model, facilityPredictorData, reportYear, facility, baselineYear);
    return model;
  }

}

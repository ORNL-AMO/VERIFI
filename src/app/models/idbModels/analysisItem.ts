import { AnalysisCategory, AnalysisGroup, AnalysisGroupPredictorVariable } from "../analysis";
import { IdbAccount } from "./account";
import { IdbFacility } from "./facility";
import { getNewIdbEntry, IdbEntry } from "./idbEntry";
import { IdbPredictor } from "./predictor";
import { IdbUtilityMeterGroup } from "./utilityMeterGroup";

export interface IdbAnalysisItem extends IdbEntry {
    id?: number,
    guid: string,
    accountId: string,
    facilityId: string,
    name: string,
    analysisCategory: AnalysisCategory,
    energyIsSource: boolean,
    calculatedReportYear: number,
    energyUnit: string,
    waterUnit: string,
    groups: Array<AnalysisGroup>,
    baselineYear: number,
    hasBanking: boolean,
    bankedAnalysisItemId: string,
    isAnalysisVisited?: boolean,
    dataCheckedDate?: Date
}

export function getNewIdbAnalysisItem(account: IdbAccount, facility: IdbFacility, accountMeterGroups: Array<IdbUtilityMeterGroup>, accountPredictors: Array<IdbPredictor>, analysisCategory: AnalysisCategory): IdbAnalysisItem {
    let idbEntry: IdbEntry = getNewIdbEntry();
    let facilityMeterGroups: Array<IdbUtilityMeterGroup> = accountMeterGroups.filter(group => { return group.facilityId == facility.guid });
    let itemGroups: Array<AnalysisGroup> = new Array();
    let predictors: Array<IdbPredictor> = accountPredictors.filter(predictor => {
        return predictor.facilityId == facility.guid;
    });
    facilityMeterGroups.forEach(group => {
      let groupTypeNeeded: 'Energy' | 'Water';
      if (analysisCategory == 'energy') {
        groupTypeNeeded = 'Energy';
      } else if (analysisCategory == 'water') {
        groupTypeNeeded = 'Water';
      }
      if (group.groupType == groupTypeNeeded) {
        let predictorVariables: Array<AnalysisGroupPredictorVariable> = predictors.map(predictor => {
          return {
            id: predictor.guid,
            name: predictor.name,
            production: predictor.production,
            productionInAnalysis: true,
            regressionCoefficient: undefined,
            unit: predictor.unit
          }
        });
        let analysisGroup: AnalysisGroup = getNewAnalysisGroup(group.guid, predictorVariables);
        itemGroups.push(analysisGroup);
      }
    });

    let baselineYear: number;
    let name: string;
    if (analysisCategory == 'energy') {
      baselineYear = facility.sustainabilityQuestions.energyReductionBaselineYear
      name = 'Energy Analysis';
    } else if (analysisCategory == 'water') {
      baselineYear = facility.sustainabilityQuestions.waterReductionBaselineYear
      name = 'Water Analysis';
    }

    let analysisItem: IdbAnalysisItem = {
        ...idbEntry,
      facilityId: facility.guid,
      accountId: account.guid,
      name: name,
      calculatedReportYear: undefined,
      energyIsSource: facility.energyIsSource,
      energyUnit: facility.energyUnit,
      waterUnit: facility.volumeLiquidUnit,
      groups: itemGroups,
      analysisCategory: analysisCategory,
      baselineYear: baselineYear,
      hasBanking: false,
      bankedAnalysisItemId: undefined,
      isAnalysisVisited: false,
      dataCheckedDate: undefined
    };
    return analysisItem;
}

export function getMonthlyPercentBaseload(): Array<{ monthNum: number, percent: number }> {
  let values: Array<{ monthNum: number, percent: number }> = new Array();
  for (let i = 0; i < 12; i++) {
    values.push({
      monthNum: i,
      percent: undefined
    })
  }
  return values;
}


export function getNewAnalysisGroup(groupId: string, predictorVariables: Array<AnalysisGroupPredictorVariable>): AnalysisGroup{

  let analysisGroup: AnalysisGroup = {
    idbGroupId: groupId,
    analysisType: 'regression',
    predictorVariables: predictorVariables,
    regressionModelYear: undefined,
    regressionModelStartMonth: undefined,
    regressionStartYear: undefined,
    regressionModelEndMonth: undefined,
    regressionEndYear: undefined,
    regressionConstant: undefined,
    specifiedMonthlyPercentBaseload: false,
    averagePercentBaseload: undefined,
    monthlyPercentBaseload: getMonthlyPercentBaseload(),
    dataAdjustments: [],
    isGeneratedModel: true,
    models: undefined,
    baselineAdjustmentsV2: [],
    maxModelVariables: 4,
    applyBanking: true,
    newBaselineYear: undefined,
    bankedAnalysisYear: undefined
  }
  return analysisGroup;
}
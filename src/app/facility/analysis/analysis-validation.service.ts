import { Injectable } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { JStatRegressionModel } from 'src/app/models/analysis';
import { AnalysisGroup, AnalysisSetupErrors, GroupErrors, IdbAnalysisItem, IdbFacility, IdbUtilityMeter, PredictorData } from 'src/app/models/idb';

@Injectable({
  providedIn: 'root'
})
export class AnalysisValidationService {

  constructor(private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService) { }

  getAnalysisItemErrors(analysisItem: IdbAnalysisItem): AnalysisSetupErrors {
    let missingName: boolean = (analysisItem.name == undefined || analysisItem.name == '');
    let noGroups: boolean = analysisItem.groups.length == 0;
    let missingReportYear: boolean = this.checkValueValid(analysisItem.reportYear) == false;
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let analysisFacility: IdbFacility = accountFacilities.find(facility => { return facility.guid == analysisItem.facilityId });
    if (analysisFacility) {
      let reportYearBeforeBaselineYear: boolean = analysisFacility.sustainabilityQuestions.energyReductionBaselineYear > analysisItem.reportYear;
      let hasError: boolean = (missingName || noGroups || missingReportYear || reportYearBeforeBaselineYear);
      let groupsHaveErrors: boolean = false;
      analysisItem.groups.forEach(group => {
        if (group.groupErrors && group.groupErrors.hasErrors) {
          groupsHaveErrors = true;
        }
      })
      return {
        hasError: hasError,
        missingName: missingName,
        noGroups: noGroups,
        missingReportYear: missingReportYear,
        reportYearBeforeBaselineYear: reportYearBeforeBaselineYear,
        groupsHaveErrors: groupsHaveErrors
      }
    } else {
      return {
        hasError: true,
        missingName: true,
        noGroups: true,
        missingReportYear: true,
        reportYearBeforeBaselineYear: true,
        groupsHaveErrors: true
      }
    }
  }

  getGroupErrors(group: AnalysisGroup): GroupErrors {
    let missingProductionVariables: boolean = false;
    let missingRegressionConstant: boolean = false;
    let missingRegressionModelYear: boolean = false;
    let missingRegressionModelSelection: boolean = false;
    let missingRegressionPredictorCoef: boolean = false;
    let invalidAverageBaseload: boolean = false;
    let invalidMonthlyBaseload: boolean = false;
    let noProductionVariables: boolean = false;
    let groupMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getGroupMetersByGroupId(group.idbGroupId);

    let hasInvalidRegressionModel: boolean = false;

    let missingGroupMeters: boolean = groupMeters.length == 0;
    if (group.analysisType != 'absoluteEnergyConsumption') {
      missingProductionVariables = this.checkMissingProductionVariables(group.predictorVariables);
      if (group.analysisType == 'regression') {
        missingRegressionConstant = this.checkValueValid(group.regressionConstant) == false;
        missingRegressionModelYear = this.checkValueValid(group.regressionModelYear) == false;
        for (let index = 0; index < group.predictorVariables.length; index++) {
          let variable: PredictorData = group.predictorVariables[index];
          if (variable.productionInAnalysis && !this.checkValueValid(variable.regressionCoefficient)) {
            missingRegressionPredictorCoef = true;
          }
        }
        if (group.userDefinedModel && !group.selectedModelId) {
          missingRegressionModelSelection = true;
        } else if (group.selectedModelId) {
          let model: JStatRegressionModel = group.models.find(model => { return model.modelId == group.selectedModelId });
          hasInvalidRegressionModel = model.isValid == false;
        }
      } else {
        let hasProductionVariable: boolean = false;
        for (let index = 0; index < group.predictorVariables.length; index++) {
          let variable: PredictorData = group.predictorVariables[index];
          if (variable.production) {
            hasProductionVariable = true;
          }
        }
        noProductionVariables = hasProductionVariable == false;
      }
      if (group.analysisType == 'modifiedEnergyIntensity') {
        if (group.specifiedMonthlyPercentBaseload) {
          for (let i = 0; i < group.monthlyPercentBaseload.length; i++) {
            if (!this.checkValueValid(group.monthlyPercentBaseload[i].percent)) {
              invalidMonthlyBaseload = true;
            }
          }
        } else if (!this.checkValueValid(group.averagePercentBaseload)) {
          invalidAverageBaseload = true;
        }
      }
    }
    let hasErrors: boolean = (missingProductionVariables || missingRegressionConstant || missingRegressionModelYear || missingRegressionModelSelection ||
      missingRegressionPredictorCoef || invalidAverageBaseload || invalidMonthlyBaseload || noProductionVariables || missingGroupMeters);
    return {
      hasErrors: hasErrors,
      missingProductionVariables: missingProductionVariables,
      missingRegressionConstant: missingRegressionConstant,
      missingRegressionModelYear: missingRegressionModelYear,
      missingRegressionModelSelection: missingRegressionModelSelection,
      missingRegressionPredictorCoef: missingRegressionPredictorCoef,
      invalidAverageBaseload: invalidAverageBaseload,
      invalidMonthlyBaseload: invalidMonthlyBaseload,
      noProductionVariables: noProductionVariables,
      missingGroupMeters: missingGroupMeters,
      hasInvalidRegressionModel: hasInvalidRegressionModel
    };
  }

  checkValueValid(value: number): boolean {
    return (value != undefined) && (value != null) && (isNaN(value) == false);
  }


  checkMissingProductionVariables(predictorVariables: Array<PredictorData>) {
    let hasProductionVariable: boolean = false;
    predictorVariables.forEach(variable => {
      if (variable.productionInAnalysis) {
        hasProductionVariable = true;
      }
    });
    return hasProductionVariable == false;
  }



}

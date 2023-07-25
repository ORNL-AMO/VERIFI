import { Injectable } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AnalysisSetupErrors, JStatRegressionModel, AnalysisGroup, GroupErrors } from 'src/app/models/analysis';
import { IdbAccountAnalysisItem, IdbAnalysisItem, IdbUtilityMeter, PredictorData } from 'src/app/models/idb';
import { AccountAnalysisSetupErrors } from 'src/app/models/accountAnalysis';
import { CalanderizationService } from './calanderization.service';

@Injectable({
  providedIn: 'root'
})
export class AnalysisValidationService {

  constructor(private utilityMeterDbService: UtilityMeterdbService,
    private calanderizationService: CalanderizationService) { }

  getAnalysisItemErrors(analysisItem: IdbAnalysisItem): AnalysisSetupErrors {
    let missingName: boolean = (analysisItem.name == undefined || analysisItem.name == '');
    let noGroups: boolean = analysisItem.groups.length == 0;
    let missingReportYear: boolean = this.checkValueValid(analysisItem.reportYear) == false;
    let missingBaselineYear: boolean = this.checkValueValid(analysisItem.baselineYear) == false;
    let reportYearBeforeBaselineYear: boolean = analysisItem.baselineYear > analysisItem.reportYear;
    let yearOptions: Array<number> = this.calanderizationService.getYearOptionsFacility(analysisItem.facilityId, analysisItem.analysisCategory);
    let baselineYearAfterMeterDataEnd: boolean = false;
    let baselineYearBeforeMeterDataStart: boolean = false;
    if (yearOptions && yearOptions.length > 0) {
      if (yearOptions[0] > analysisItem.baselineYear) {
        baselineYearBeforeMeterDataStart = true;
      }
      if (yearOptions[yearOptions.length - 1] < analysisItem.baselineYear) {
        baselineYearAfterMeterDataEnd = true;
      };
    }

    let hasError: boolean = (missingName || noGroups || missingReportYear || reportYearBeforeBaselineYear || baselineYearAfterMeterDataEnd || baselineYearBeforeMeterDataStart);
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
      groupsHaveErrors: groupsHaveErrors,
      missingBaselineYear: missingBaselineYear,
      baselineYearAfterMeterDataEnd: baselineYearAfterMeterDataEnd,
      baselineYearBeforeMeterDataStart: baselineYearBeforeMeterDataStart
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
    if (group.analysisType != 'absoluteEnergyConsumption' && group.analysisType != 'skipAnalysis' && group.analysisType != 'skip') {
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


  getAccountAnalysisSetupErrors(analysisItem: IdbAccountAnalysisItem, allAnalysisItems: Array<IdbAnalysisItem>): AccountAnalysisSetupErrors {
    let missingName: boolean = (analysisItem.name == undefined || analysisItem.name == '');
    let missingReportYear: boolean = this.checkValueValid(analysisItem.reportYear) == false;
    let missingBaselineYear: boolean = this.checkValueValid(analysisItem.baselineYear) == false;
    let reportYearBeforeBaselineYear: boolean = analysisItem.baselineYear >= analysisItem.reportYear;
    let hasError: boolean = (missingName || missingReportYear || missingBaselineYear || reportYearBeforeBaselineYear);
    let facilitiesSelectionsErrors: Array<boolean> = [];
    if (analysisItem.facilityAnalysisItems) {
      analysisItem.facilityAnalysisItems.forEach(item => {
        if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
          let analysisItem: IdbAnalysisItem = allAnalysisItems.find(analysisItem => { return analysisItem.guid == item.analysisItemId });
          if (analysisItem.setupErrors.hasError || analysisItem.setupErrors.groupsHaveErrors) {
            facilitiesSelectionsErrors.push(true)
          } else {
            facilitiesSelectionsErrors.push(false);
          }
        } else {
          if (item.analysisItemId == 'skip') {
            facilitiesSelectionsErrors.push(false);
          } else {
            facilitiesSelectionsErrors.push(true);
          }
        }
      });
    }
    let facilitiesSelectionsInvalid: boolean = facilitiesSelectionsErrors.includes(true);
    return {
      hasError: hasError,
      missingName: missingName,
      missingReportYear: missingReportYear,
      missingBaselineYear: missingBaselineYear,
      reportYearBeforeBaselineYear: reportYearBeforeBaselineYear,
      facilitiesSelectionsInvalid: facilitiesSelectionsInvalid
    }
  }

  updateFacilitySelectionErrors(analysisItem: IdbAccountAnalysisItem, allAnalysisItems: Array<IdbAnalysisItem>): { analysisItem: IdbAccountAnalysisItem, isChanged: boolean } {
    let facilitiesSelectionsErrors: Array<boolean> = [];
    analysisItem.facilityAnalysisItems.forEach(item => {
      if (item.analysisItemId != undefined && item.analysisItemId != 'skip') {
        let analysisItem: IdbAnalysisItem = allAnalysisItems.find(analysisItem => { return analysisItem.guid == item.analysisItemId });
        if (analysisItem.setupErrors.hasError || analysisItem.setupErrors.groupsHaveErrors) {
          facilitiesSelectionsErrors.push(true)
        } else {
          facilitiesSelectionsErrors.push(false);
        }
      } else {
        if (item.analysisItemId == 'skip') {
          facilitiesSelectionsErrors.push(false);
        } else {
          facilitiesSelectionsErrors.push(true);
        }
      }
    });
    let facilitiesSelectionsInvalid: boolean = facilitiesSelectionsErrors.includes(true);
    let isChanged: boolean = false;
    if (facilitiesSelectionsInvalid != analysisItem.setupErrors.facilitiesSelectionsInvalid) {
      analysisItem.setupErrors.facilitiesSelectionsInvalid = facilitiesSelectionsInvalid;
      isChanged = true;
    }
    return { analysisItem: analysisItem, isChanged: isChanged };
  }

}

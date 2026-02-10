import { Injectable } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AnalysisSetupErrors, JStatRegressionModel, AnalysisGroup, GroupErrors, AnalysisGroupPredictorVariable } from 'src/app/models/analysis';
import { AccountAnalysisSetupErrors } from 'src/app/models/accountAnalysis';
import { CalanderizationService } from './calanderization.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';

@Injectable({
  providedIn: 'root'
})
export class AnalysisValidationService {

  constructor(private utilityMeterDbService: UtilityMeterdbService,
    private calanderizationService: CalanderizationService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDataDbService: PredictorDataDbService) {
  }

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
    let bankingError: boolean = false;
    if (analysisItem.hasBanking) {
      bankingError = analysisItem.bankedAnalysisItemId == undefined;
    }

    let hasError: boolean = (missingName || noGroups || missingReportYear || reportYearBeforeBaselineYear || baselineYearAfterMeterDataEnd || baselineYearBeforeMeterDataStart || bankingError);
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
      baselineYearBeforeMeterDataStart: baselineYearBeforeMeterDataStart,
      bankingError: bankingError
    }
  }

  getGroupErrors(group: AnalysisGroup, analysisItem: IdbAnalysisItem): GroupErrors {
    let missingProductionVariables: boolean = false;
    let missingRegressionConstant: boolean = false;
    let missingRegressionModelYear: boolean = false;
    let missingRegressionModelStartMonth: boolean = false;
    let missingRegressionStartYear: boolean = false;
    let missingRegressionModelEndMonth: boolean = false;
    let missingRegressionEndYear: boolean = false;
    let invalidModelDateSelection: boolean = false;
    let missingRegressionModelSelection: boolean = false;
    let missingRegressionPredictorCoef: boolean = false;
    let invalidAverageBaseload: boolean = false;
    let invalidMonthlyBaseload: boolean = false;
    let noProductionVariables: boolean = false;
    let missingBankingBaselineYear: boolean = false;
    let missingBankingAppliedYear: boolean = false;
    let invalidBankingYears: boolean = false;
    let groupMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getGroupMetersByGroupId(group.idbGroupId);
    let hasInvalidRegressionModel: boolean = false;

    let isDateRangeValid: boolean = true;
    let isTwelveMonthSelected: boolean = true;
    let allMeterReadingsPresent: boolean = true;
    let allPredictorReadingsPresent: boolean = true;
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(analysisItem.facilityId);
    let facilityPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByFacilityId(analysisItem.facilityId);
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(analysisItem.facilityId);

    let missingGroupMeters: boolean = groupMeters.length == 0;
    if (group.analysisType != 'absoluteEnergyConsumption' && group.analysisType != 'skipAnalysis' && group.analysisType != 'skip') {
      missingProductionVariables = this.checkMissingProductionVariables(group.predictorVariables);
      if (group.analysisType == 'regression') {
        missingRegressionConstant = this.checkValueValid(group.regressionConstant) == false;
        missingRegressionModelYear = this.checkValueValid(group.regressionModelYear) == false;
        if (!group.userDefinedModel) {
          missingRegressionModelYear = false;
          missingRegressionModelStartMonth = this.checkValueValid(group.regressionModelStartMonth) == false;
          missingRegressionStartYear = this.checkValueValid(group.regressionStartYear) == false;
          missingRegressionModelEndMonth = this.checkValueValid(group.regressionModelEndMonth) == false;
          missingRegressionEndYear = this.checkValueValid(group.regressionEndYear) == false;

          isDateRangeValid = this.checkDateRangeValidity(group);
          isTwelveMonthSelected = this.checkTwelveMonthSelection(group);
          allMeterReadingsPresent = this.validateMeterDataForSelectedDates(group, facilityMeterData, facilityMeters);
          allPredictorReadingsPresent = this.validatePredictorDataForSelectedDates(group, facilityPredictorData);

          if (isDateRangeValid && isTwelveMonthSelected && allMeterReadingsPresent && allPredictorReadingsPresent) {
            invalidModelDateSelection = false;
          }
          else {
            invalidModelDateSelection = true;
          }
        }
        for (let index = 0; index < group.predictorVariables.length; index++) {
          let variable: AnalysisGroupPredictorVariable = group.predictorVariables[index];
          if (variable.productionInAnalysis && !this.checkValueValid(variable.regressionCoefficient)) {
            missingRegressionPredictorCoef = true;
          }
        }
        if (group.userDefinedModel && !group.selectedModelId) {
          missingRegressionModelSelection = true;
        } else if (group.selectedModelId) {
          let model: JStatRegressionModel = group.models.find(model => { return model.modelId == group.selectedModelId });
          hasInvalidRegressionModel = model?.isValid == false;
        }
      } else {
        let hasProductionVariable: boolean = false;
        for (let index = 0; index < group.predictorVariables.length; index++) {
          let variable: AnalysisGroupPredictorVariable = group.predictorVariables[index];
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

      if (analysisItem.hasBanking && group.applyBanking) {
        if (!group.newBaselineYear) {
          missingBankingBaselineYear = true;
        }

        if (!group.bankedAnalysisYear) {
          missingBankingAppliedYear = true;
        }
        if (group.bankedAnalysisYear && group.newBaselineYear) {
          invalidBankingYears = (group.bankedAnalysisYear >= group.newBaselineYear);
        }
      }
    }
    let hasErrors: boolean = (missingProductionVariables || missingRegressionConstant || missingRegressionModelYear || missingRegressionModelStartMonth || missingRegressionStartYear || missingRegressionModelEndMonth || missingRegressionEndYear || invalidModelDateSelection || missingRegressionModelSelection ||
      missingRegressionPredictorCoef || invalidAverageBaseload || invalidMonthlyBaseload || noProductionVariables || missingGroupMeters || missingBankingBaselineYear || missingBankingAppliedYear ||
      invalidBankingYears);
    return {
      hasErrors: hasErrors,
      missingProductionVariables: missingProductionVariables,
      missingRegressionConstant: missingRegressionConstant,
      missingRegressionModelYear: missingRegressionModelYear,
      missingRegressionModelStartMonth: missingRegressionModelStartMonth,
      missingRegressionStartYear: missingRegressionStartYear,
      missingRegressionModelEndMonth: missingRegressionModelEndMonth,
      missingRegressionEndYear: missingRegressionEndYear,
      invalidModelDateSelection: invalidModelDateSelection,
      missingRegressionModelSelection: missingRegressionModelSelection,
      missingRegressionPredictorCoef: missingRegressionPredictorCoef,
      invalidAverageBaseload: invalidAverageBaseload,
      invalidMonthlyBaseload: invalidMonthlyBaseload,
      noProductionVariables: noProductionVariables,
      missingGroupMeters: missingGroupMeters,
      hasInvalidRegressionModel: hasInvalidRegressionModel,
      missingBankingBaselineYear: missingBankingBaselineYear,
      missingBankingAppliedYear: missingBankingAppliedYear,
      invalidBankingYears: invalidBankingYears
    };
  }

  checkValueValid(value: number): boolean {
    return (value != undefined) && (value != null) && (isNaN(value) == false);
  }


  checkMissingProductionVariables(predictorVariables: Array<AnalysisGroupPredictorVariable>) {
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

  validateMeterDataForSelectedDates(group: AnalysisGroup, facilityMeterData: Array<IdbUtilityMeterData>, facilityMeters: Array<IdbUtilityMeter>): boolean {
    let month = group.regressionModelStartMonth;
    let year = group.regressionStartYear;
    const endMonth = group.regressionModelEndMonth;
    const endYear = group.regressionEndYear;
    let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => meter.groupId == group.idbGroupId);
    let groupMeterIds: Array<string> = groupMeters.map(meter => meter.guid);
    let groupMeterData: Array<IdbUtilityMeterData> = facilityMeterData.filter(data => {
      return groupMeterIds.includes(data.meterId);
    });
    while (year < endYear || (year === endYear && month <= endMonth)) {
      const dataPresent = groupMeterData.some(meterData => {
        return meterData.year === year && meterData.month - 1 === month;
      });
      if (!dataPresent) {
        return false;
      }
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
    return true;
  }

  validatePredictorDataForSelectedDates(group: AnalysisGroup, facilityPredictorData: Array<IdbPredictorData>) {
    let allPresent: boolean = true;
    group.predictorVariables.forEach(variable => {
      if (variable.productionInAnalysis) {
        const variablePredictorData = facilityPredictorData.filter(predictor => predictor.predictorId === variable.id);

        let month = group.regressionModelStartMonth;;
        let year = group.regressionStartYear;
        const endMonth = group.regressionModelEndMonth;
        const endYear = group.regressionEndYear;

        while (year < endYear || (year === endYear && month <= endMonth)) {
          const dataPresent = variablePredictorData.some(predictorData => {
            return predictorData.year === year && predictorData.month - 1 === month;
          });
          if (!dataPresent) {
            allPresent = false;
            break;
          }
          month++;
          if (month > 11) {
            month = 0;
            year++;
          }
        }
      }
    });
    return allPresent;
  }

  checkDateRangeValidity(group: AnalysisGroup) {
    const startMonth = group.regressionModelStartMonth;
    const startYear = group.regressionStartYear;
    const endMonth = group.regressionModelEndMonth;
    const endYear = group.regressionEndYear;
    if (endYear < startYear) {
      return false;
    } else if (endYear === startYear && endMonth < startMonth) {
      return false;
    }
    return true;
  }

  checkTwelveMonthSelection(group: AnalysisGroup) {
    const totalMonths = (group.regressionEndYear - group.regressionStartYear) * 12 + (group.regressionModelEndMonth - group.regressionModelStartMonth) + 1;
    return totalMonths >= 12;
  }

}

import { getYearsWithFullData } from "src/app/calculations/shared-calculations/calculationsHelpers";
import { AnalysisGroup, AnalysisGroupPredictorVariable, JStatRegressionModel } from "src/app/models/analysis";
import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization"
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem"
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { checkNumberValueValid } from "./validationHelpers";
import { AnalysisSetupErrors, GroupAnalysisErrors } from "src/app/models/validation";

export function getAnalysisSetupErrors(analysisItem: IdbAnalysisItem, calendarizedMeters: Array<CalanderizedMeter>, facility: IdbFacility, facilityPredictorData: Array<IdbPredictorData>): AnalysisSetupErrors {
    let missingName: boolean = (analysisItem.name == undefined || analysisItem.name == '');
    let noGroups: boolean = analysisItem.groups.length == 0;
    let missingBaselineYear: boolean = checkNumberValueValid(analysisItem.baselineYear) == false;
    let facilityCalanderizedMeters: Array<CalanderizedMeter> = calendarizedMeters.filter(cMeter => cMeter.meter.facilityId == analysisItem.facilityId);
    let yearOptions: Array<number> = getYearsWithFullData(facilityCalanderizedMeters, facility);
    let baselineYearAfterMeterDataEnd: boolean = false;
    let baselineYearBeforeMeterDataStart: boolean = false;
    if (yearOptions && yearOptions.length > 0) {
        let maxYear: number = Math.max(...yearOptions);
        let minYear: number = Math.min(...yearOptions);
        if (minYear > analysisItem.baselineYear) {
            baselineYearBeforeMeterDataStart = true;
        }
        if (maxYear < analysisItem.baselineYear) {
            baselineYearAfterMeterDataEnd = true;
        };
    }
    let bankingError: boolean = false;
    if (analysisItem.hasBanking) {
        bankingError = analysisItem.bankedAnalysisItemId == undefined;
    }
    let groupErrors: Array<GroupAnalysisErrors> = analysisItem.groups.map(group => {
        return getGroupErrors(group, analysisItem, facilityCalanderizedMeters, facilityPredictorData);
    });
    let groupsHaveErrors: boolean = groupErrors.some(groupError => {
        return groupError && groupError.hasErrors;
    });
    let setupHasError: boolean = (missingName || noGroups || missingBaselineYear || baselineYearAfterMeterDataEnd || baselineYearBeforeMeterDataStart || bankingError);
    let hasError: boolean = (setupHasError || groupsHaveErrors);
    return {
        hasError: hasError,
        setupHasError: setupHasError,
        missingName: missingName,
        noGroups: noGroups,
        groupsHaveErrors: groupsHaveErrors,
        missingBaselineYear: missingBaselineYear,
        baselineYearAfterMeterDataEnd: baselineYearAfterMeterDataEnd,
        baselineYearBeforeMeterDataStart: baselineYearBeforeMeterDataStart,
        bankingError: bankingError,
        groupErrors: groupErrors
    }
}


export function emptyAnalysisSetupErrors(): AnalysisSetupErrors {
    return {
        hasError: false,
        setupHasError: false,
        missingName: false,
        noGroups: false,
        groupsHaveErrors: false,
        missingBaselineYear: false,
        baselineYearAfterMeterDataEnd: false,
        baselineYearBeforeMeterDataStart: false,
        bankingError: false,
        groupErrors: []
    }
}

export function getGroupErrors(group: AnalysisGroup, analysisItem: IdbAnalysisItem, calendarizedMeters: Array<CalanderizedMeter>, facilityPredictorData: Array<IdbPredictorData>): GroupAnalysisErrors {
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
    let hasInvalidRegressionModel: boolean = false;
    let isDateRangeValid: boolean = true;
    let isTwelveMonthSelected: boolean = true;
    let allMeterReadingsPresent: boolean = true;
    let allPredictorReadingsPresent: boolean = true;
    let hasRegressoinErrors: boolean = false;
    let hasInvalidUserDefinedModel: boolean = false;

    let groupCalanderizedMeters: Array<CalanderizedMeter> = calendarizedMeters.filter(data => {
        return data.meter.groupId == group.idbGroupId;
    });
    let missingGroupMeters: boolean = false;
    if (group.analysisType != 'absoluteEnergyConsumption' && group.analysisType != 'skipAnalysis' && group.analysisType != 'skip') {
        missingGroupMeters = groupCalanderizedMeters.length == 0;
        missingProductionVariables = checkMissingProductionVariables(group.predictorVariables);
        if (group.analysisType == 'regression') {
            missingRegressionConstant = checkNumberValueValid(group.regressionConstant) == false;
            missingRegressionModelYear = checkNumberValueValid(group.regressionModelYear) == false;
            if (!group.userDefinedModel) {
                missingRegressionModelYear = false;
                missingRegressionModelStartMonth = checkNumberValueValid(group.regressionModelStartMonth) == false;
                missingRegressionStartYear = checkNumberValueValid(group.regressionStartYear) == false;
                missingRegressionModelEndMonth = checkNumberValueValid(group.regressionModelEndMonth) == false;
                missingRegressionEndYear = checkNumberValueValid(group.regressionEndYear) == false;

                isDateRangeValid = checkDateRangeValidity(group);
                isTwelveMonthSelected = checkTwelveMonthSelection(group);
                allMeterReadingsPresent = validateMeterDataForSelectedDates(group, groupCalanderizedMeters);
                allPredictorReadingsPresent = validatePredictorDataForSelectedDates(group, facilityPredictorData);

                if (isDateRangeValid && isTwelveMonthSelected && allMeterReadingsPresent && allPredictorReadingsPresent) {
                    invalidModelDateSelection = false;
                }
                else {
                    invalidModelDateSelection = true;
                }
                hasInvalidUserDefinedModel = (missingRegressionModelStartMonth ||
                    missingRegressionModelEndMonth ||
                    missingRegressionStartYear ||
                    missingRegressionEndYear ||
                    invalidModelDateSelection ||
                    missingRegressionConstant ||
                    missingRegressionPredictorCoef)
            }
            for (let index = 0; index < group.predictorVariables.length; index++) {
                let variable: AnalysisGroupPredictorVariable = group.predictorVariables[index];
                if (variable.productionInAnalysis && !checkNumberValueValid(variable.regressionCoefficient)) {
                    missingRegressionPredictorCoef = true;
                }
            }
            if (group.userDefinedModel && !group.selectedModelId) {
                missingRegressionModelSelection = true;
            } else if (group.selectedModelId) {
                let model: JStatRegressionModel = group.models.find(model => { return model.modelId == group.selectedModelId });
                hasInvalidRegressionModel = model?.isValid == false;
            }

            hasRegressoinErrors = (missingRegressionConstant ||
                missingRegressionModelYear ||
                missingRegressionModelStartMonth ||
                missingRegressionStartYear ||
                missingRegressionModelEndMonth ||
                missingRegressionEndYear ||
                invalidModelDateSelection ||
                missingRegressionModelSelection ||
                missingRegressionPredictorCoef)
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
                    if (!checkNumberValueValid(group.monthlyPercentBaseload[i].percent)) {
                        invalidMonthlyBaseload = true;
                    }
                }
            } else if (!checkNumberValueValid(group.averagePercentBaseload)) {
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

    let hasSetupErrors: boolean = (invalidAverageBaseload ||
        noProductionVariables ||
        invalidAverageBaseload ||
        invalidMonthlyBaseload ||
        missingGroupMeters ||
        invalidBankingYears ||
        missingBankingAppliedYear ||
        missingBankingBaselineYear)

    return {
        groupId: group.idbGroupId,
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
        invalidBankingYears: invalidBankingYears,
        hasSetupErrors: hasSetupErrors,
        hasRegressionErrors: hasRegressoinErrors,
        hasInvalidUserDefinedModel: hasInvalidUserDefinedModel
    };
}

export function checkMissingProductionVariables(predictorVariables: Array<AnalysisGroupPredictorVariable>) {
    return predictorVariables.some(variable => variable.productionInAnalysis) == false;
}

export function checkDateRangeValidity(group: AnalysisGroup) {
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

export function checkTwelveMonthSelection(group: AnalysisGroup) {
    const totalMonths = (group.regressionEndYear - group.regressionStartYear) * 12 + (group.regressionModelEndMonth - group.regressionModelStartMonth) + 1;
    return totalMonths >= 12;
}

export function validatePredictorDataForSelectedDates(group: AnalysisGroup, facilityPredictorData: Array<IdbPredictorData>) {
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

export function validateMeterDataForSelectedDates(group: AnalysisGroup, groupCalanderizedMeters: Array<CalanderizedMeter>): boolean {
    let month = group.regressionModelStartMonth;
    let year = group.regressionStartYear;
    const endMonth = group.regressionModelEndMonth;
    const endYear = group.regressionEndYear;
    let groupCalendarizedMeters: Array<CalanderizedMeter> = groupCalanderizedMeters.filter(data => {
        return data.meter.groupId == group.idbGroupId;
    });
    let groupMonthlyData: Array<MonthlyData> = groupCalendarizedMeters.flatMap(meter => meter.monthlyData);
    while (year < endYear || (year === endYear && month <= endMonth)) {
        const dataPresent = groupMonthlyData.some(meterData => {
            return meterData.year === year && meterData.monthNumValue - 1 === month;
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
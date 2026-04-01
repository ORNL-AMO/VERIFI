import { AnalysisGroup, AnalysisGroupPredictorVariable, JStatRegressionModel } from "src/app/models/analysis";
import { GroupAnalysisErrors } from "src/app/models/validation";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { checkNumberValueValid } from "./validationHelpers";

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
    let hasRegressionErrors: boolean = false;
    let hasInvalidUserDefinedModel: boolean = false;
    let missingGroupMeters: boolean = false;

    if (calendarizedMeters.length != 0) {
        let groupCalanderizedMeters: Array<CalanderizedMeter> = calendarizedMeters.filter(data => {
            return data.meter.groupId == group.idbGroupId;
        });
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

                hasRegressionErrors = (missingRegressionConstant ||
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
    }
    let hasErrors: boolean = (missingProductionVariables || missingRegressionConstant || missingRegressionModelYear || missingRegressionModelStartMonth || missingRegressionStartYear || missingRegressionModelEndMonth || missingRegressionEndYear || invalidModelDateSelection || missingRegressionModelSelection ||
        missingRegressionPredictorCoef || invalidAverageBaseload || invalidMonthlyBaseload || noProductionVariables || missingGroupMeters || missingBankingBaselineYear || missingBankingAppliedYear ||
        invalidBankingYears || hasRegressionErrors);

    let hasSetupErrors: boolean = (invalidAverageBaseload ||
        noProductionVariables ||
        invalidAverageBaseload ||
        invalidMonthlyBaseload ||
        missingGroupMeters ||
        invalidBankingYears ||
        missingBankingAppliedYear ||
        missingBankingBaselineYear)

    let errors: GroupAnalysisErrors = {
        groupId: group.idbGroupId,
        analysisId: analysisItem.guid,
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
        hasRegressionErrors: hasRegressionErrors,
        hasInvalidUserDefinedModel: hasInvalidUserDefinedModel,
        isDateRangeValid: isDateRangeValid,
        isTwelveMonthSelected: isTwelveMonthSelected,
        allMeterReadingsPresent: allMeterReadingsPresent,
        allPredictorReadingsPresent: allPredictorReadingsPresent
    };
    return errors;
}

export function emptyGroupAnalysisErrors(): GroupAnalysisErrors {
    return {
        groupId: '',
        analysisId: '',
        hasErrors: false,
        missingProductionVariables: false,
        missingRegressionConstant: false,
        missingRegressionModelYear: false,
        missingRegressionModelStartMonth: false,
        missingRegressionStartYear: false,
        missingRegressionModelEndMonth: false,
        missingRegressionEndYear: false,
        invalidModelDateSelection: false,
        missingRegressionModelSelection: false,
        missingRegressionPredictorCoef: false,
        invalidAverageBaseload: false,
        invalidMonthlyBaseload: false,
        noProductionVariables: false,
        missingGroupMeters: false,
        hasInvalidRegressionModel: false,
        missingBankingBaselineYear: false,
        missingBankingAppliedYear: false,
        invalidBankingYears: false,
        hasSetupErrors: false,
        hasRegressionErrors: false,
        hasInvalidUserDefinedModel: false,
        isDateRangeValid: true,
        isTwelveMonthSelected: true,
        allMeterReadingsPresent: true,
        allPredictorReadingsPresent: true
    }
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

export function validatePredictorDataForSelectedDates(group: AnalysisGroup, facilityPredictorData: Array<IdbPredictorData>): boolean {
    // Build a Map: predictorId -> Set of 'year-month' for fast lookup
    const predictorDataMap: Map<string, Set<string>> = new Map();
    for (const pd of facilityPredictorData) {
        const key = `${pd.year}-${pd.month}`;
        if (!predictorDataMap.has(pd.predictorId)) {
            predictorDataMap.set(pd.predictorId, new Set());
        }
        predictorDataMap.get(pd.predictorId)!.add(key);
    }

    for (const variable of group.predictorVariables) {
        if (variable.productionInAnalysis) {
            const dataSet = predictorDataMap.get(variable.id);
            if (!dataSet) {
                return false;
            }
            let month = group.regressionModelStartMonth;
            let year = group.regressionStartYear;
            const endMonth = group.regressionModelEndMonth;
            const endYear = group.regressionEndYear;
            while (year < endYear || (year === endYear && month <= endMonth)) {
                const key = `${year}-${month + 1}`; // month+1 because original data uses 1-based months
                if (!dataSet.has(key)) {
                    return false;
                }
                month++;
                if (month > 11) {
                    month = 0;
                    year++;
                }
            }
        }
    }
    return true;
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
            return meterData.year === year && meterData.monthNumValue === month;
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
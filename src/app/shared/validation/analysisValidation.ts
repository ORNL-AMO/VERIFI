import { getYearsWithFullData } from "src/app/calculations/shared-calculations/calculationsHelpers";
import { CalanderizedMeter } from "src/app/models/calanderization"
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem"
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { checkNumberValueValid } from "./validationHelpers";
import { AnalysisSetupErrors, GroupAnalysisErrors } from "src/app/models/validation";
import { getGroupErrors } from "./groupAnalysisValidation";

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

import { IdbFacilityReport } from "src/app/models/idbModels/facilityReport";
import { AnalysisSetupErrors, FacilityReportErrors } from "src/app/models/validation";

export function getFacilityReportErrors(facilityReport: IdbFacilityReport,
    analysisSetupErrors: Array<AnalysisSetupErrors>): FacilityReportErrors {
    let errors: FacilityReportErrors = {
        reportId: facilityReport.guid,
        hasErrors: false,
        missingName: false,
        missingBaselineYear: false,
        missingReportYear: false,
        missingStartDate: false,
        missingEndDate: false,
        invalidDateRange: false,
        baselineAfterReportYear: false,
        analysisHasErrors: false
    };

    errors.missingName = !facilityReport.name || facilityReport.name.toString().trim() === '';

    let linkedAnalysisItemId: string;
    let analysisNeeded: boolean = false;
    // 'analysis' | 'overview' | 'emissionFactors' | 'savings' | 'modeling'
    if (facilityReport.facilityReportType == 'overview') {
        //startYear
        //startMonth
        //endYear
        //endMonth
        //check missing start and end data
        errors.missingStartDate = (facilityReport.dataOverviewReportSettings.startMonth === undefined || facilityReport.dataOverviewReportSettings.startMonth === null || isNaN(facilityReport.dataOverviewReportSettings.startMonth))
            || (facilityReport.dataOverviewReportSettings.startYear === undefined || facilityReport.dataOverviewReportSettings.startYear === null || isNaN(facilityReport.dataOverviewReportSettings.startYear));
        errors.missingEndDate = (facilityReport.dataOverviewReportSettings.endMonth === undefined || facilityReport.dataOverviewReportSettings.endMonth === null || isNaN(facilityReport.dataOverviewReportSettings.endMonth))
            || (facilityReport.dataOverviewReportSettings.endYear === undefined || facilityReport.dataOverviewReportSettings.endYear === null || isNaN(facilityReport.dataOverviewReportSettings.endYear));

        if (!errors.missingStartDate && !errors.missingEndDate) {
            const startDate = new Date(facilityReport.dataOverviewReportSettings.startYear, facilityReport.dataOverviewReportSettings.startMonth, 1);
            const endDate = new Date(facilityReport.dataOverviewReportSettings.endYear, facilityReport.dataOverviewReportSettings.endMonth, 1);
            if (startDate.getTime() >= endDate.getTime()) {
                errors.invalidDateRange = true;
            }
        }


    } else if (facilityReport.facilityReportType == 'analysis') {
        //ananlysisHasErrors
        //reportYear
        analysisNeeded = true;
        linkedAnalysisItemId = facilityReport.analysisItemId;
        errors.missingReportYear = facilityReport.analysisReportSettings.reportYear === undefined || facilityReport.analysisReportSettings.reportYear === null || isNaN(facilityReport.analysisReportSettings.reportYear);

    } else if (facilityReport.facilityReportType == 'emissionFactors') {
        //startYear
        //endYear
        errors.missingBaselineYear = facilityReport.emissionFactorsReportSettings.startYear !== undefined && !isNaN(facilityReport.emissionFactorsReportSettings.startYear) ? false : true;
        errors.missingReportYear = facilityReport.emissionFactorsReportSettings.endYear !== undefined && !isNaN(facilityReport.emissionFactorsReportSettings.endYear) ? false : true;
        if (!errors.missingBaselineYear && !errors.missingReportYear) {
            const startDate = new Date(facilityReport.emissionFactorsReportSettings.startYear, 0, 1);
            const endDate = new Date(facilityReport.emissionFactorsReportSettings.endYear, 0, 1);
            if (startDate.getTime() >= endDate.getTime()) {
                errors.invalidDateRange = true;
            }
        }
    } else if (facilityReport.facilityReportType == 'savings') {
        //endYear
        //endMonth
        //analysisHasErrors
        analysisNeeded = true;
        linkedAnalysisItemId = facilityReport.analysisItemId;
        errors.missingReportYear = facilityReport.savingsReportSettings.endYear === undefined || facilityReport.savingsReportSettings.endYear === null || isNaN(facilityReport.savingsReportSettings.endYear);
        errors.missingEndDate = facilityReport.savingsReportSettings.endMonth === undefined || facilityReport.savingsReportSettings.endMonth === null || isNaN(facilityReport.savingsReportSettings.endMonth);
    } else if (facilityReport.facilityReportType == 'modeling') {
        //reportYear
        //analysisHasErrors
        analysisNeeded = true;
        linkedAnalysisItemId = facilityReport.analysisItemId;
        errors.missingReportYear = facilityReport.modelingReportSettings.reportYear === undefined || facilityReport.modelingReportSettings.reportYear === null || isNaN(facilityReport.modelingReportSettings.reportYear);
    }
    if (analysisNeeded) {
        if (!linkedAnalysisItemId) {
            errors.analysisHasErrors = true;
        } else {
            let analysisItemErrors: AnalysisSetupErrors = analysisSetupErrors.find(error => error.analysisId == linkedAnalysisItemId);
            if (!analysisItemErrors) {
                errors.analysisHasErrors = true;
            } else {
                errors.analysisHasErrors = analysisItemErrors.hasError;
            }
        }
    }

    errors.hasErrors = errors.missingName || errors.missingBaselineYear || errors.missingReportYear || errors.missingStartDate || errors.missingEndDate || errors.invalidDateRange || errors.baselineAfterReportYear || errors.analysisHasErrors;
    return errors;
}

export function emptyFacilityReportErrors(): FacilityReportErrors {
    return {
        reportId: '',
        hasErrors: false,
        missingName: false,
        missingBaselineYear: false,
        missingReportYear: false,
        missingStartDate: false,
        missingEndDate: false,
        invalidDateRange: false,
        baselineAfterReportYear: false,
        analysisHasErrors: false
    }
}
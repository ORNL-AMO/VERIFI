import { AccountReportErrors } from "src/app/models/validation";
import { IdbAccountReport } from "src/app/models/idbModels/accountReport";
import { AccountAnalysisSetupErrors } from "src/app/models/accountAnalysis";

export function getAccountReportErrors(accountReport: IdbAccountReport,
    accountAnalysisSetupErrors: Array<AccountAnalysisSetupErrors>): AccountReportErrors {
    let errors: AccountReportErrors = {
        reportId: accountReport.guid,
        hasErrors: false,
        missingName: false,
        missingReportType: false,
        invalidDateRange: false,
        baselineAfterReportYear: false,
        missingReportYear: false,
        missingBaselineYear: false,
        missingStartDate: false,
        missingEndDate: false,
        analysisHasErrors: false
    };
    // Required field checks
    errors.missingName = !accountReport.name || accountReport.name.toString().trim() === '';
    errors.missingReportType = !accountReport.reportType || accountReport.reportType.toString().trim() === '';

    // Report year and baseline year requirements
    const yearRequiredTypes = ["betterPlants", "performance", "betterClimate", "analysis"];
    const endDateRequiredTypes = ["dataOverview", "accountSavings"];
    const startDateRequiredTypes = ["dataOverview"];

    // Report year
    if (yearRequiredTypes.includes(accountReport.reportType)) {
        errors.missingReportYear = accountReport.reportYear === undefined || accountReport.reportYear === null || isNaN(accountReport.reportYear);
    }
    // Baseline year
    if (yearRequiredTypes.includes(accountReport.reportType)) {
        errors.missingBaselineYear = accountReport.baselineYear === undefined || accountReport.baselineYear === null || isNaN(accountReport.baselineYear);
    }

    // Start date
    if (startDateRequiredTypes.includes(accountReport.reportType)) {
        errors.missingStartDate = (accountReport.startMonth === undefined || accountReport.startMonth === null || isNaN(accountReport.startMonth))
            || (accountReport.startYear === undefined || accountReport.startYear === null || isNaN(accountReport.startYear));
    }

    // End date
    if (endDateRequiredTypes.includes(accountReport.reportType)) {
        errors.missingEndDate = (accountReport.endMonth === undefined || accountReport.endMonth === null || isNaN(accountReport.endMonth))
            || (accountReport.endYear === undefined || accountReport.endYear === null || isNaN(accountReport.endYear));
    }

    // Date range logic (from validateReport)
    if (accountReport.reportType == 'dataOverview') {
        if (
            accountReport.startMonth !== undefined && accountReport.endMonth !== undefined &&
            accountReport.startYear !== undefined && accountReport.endYear !== undefined &&
            !isNaN(accountReport.startMonth) && !isNaN(accountReport.endMonth) &&
            !isNaN(accountReport.startYear) && !isNaN(accountReport.endYear)
        ) {
            const startDate = new Date(accountReport.startYear, accountReport.startMonth, 1);
            const endDate = new Date(accountReport.endYear, accountReport.endMonth, 1);
            if (startDate.getTime() >= endDate.getTime()) {
                errors.invalidDateRange = true;
            }
        }
    } else if (accountReport.reportType == 'accountEmissionFactors') {
        if (
            accountReport.startYear !== undefined && accountReport.endYear !== undefined &&
            !isNaN(accountReport.startYear) && !isNaN(accountReport.endYear)
        ) {
            const startDate = new Date(accountReport.startYear, 0, 1);
            const endDate = new Date(accountReport.endYear, 0, 1);
            if (startDate.getTime() >= endDate.getTime()) {
                errors.invalidDateRange = true;
            }
        }
    }

    // Baseline year vs report year (from compareBaselineYearToReportYear)
    if (["performance", "betterClimate"].includes(accountReport.reportType)) {
        if (
            accountReport.baselineYear !== undefined && accountReport.reportYear !== undefined &&
            !isNaN(accountReport.baselineYear) && !isNaN(accountReport.reportYear) &&
            accountReport.reportYear < accountReport.baselineYear
        ) {
            errors.baselineAfterReportYear = true;
        }
    }
    //Check linked analysis
    //savings
    //better plants
    //analysis report
    //performance report
    let linkedAnalysisItemId: string;
    if (accountReport.reportType == 'betterPlants') {
        if (!accountReport.betterPlantsReportSetup.analysisItemId) {
            errors.analysisHasErrors = true;
        } else {
            linkedAnalysisItemId = accountReport.betterPlantsReportSetup.analysisItemId;
        }
    } else if (accountReport.reportType == 'performance') {
        if (!accountReport.performanceReportSetup.analysisItemId) {
            errors.analysisHasErrors = true;
        } else {
            linkedAnalysisItemId = accountReport.performanceReportSetup.analysisItemId;
        }
    } else if (accountReport.reportType == 'analysis') {
        if (!accountReport.analysisReportSetup.analysisItemId) {
            errors.analysisHasErrors = true;
        } else {
            linkedAnalysisItemId = accountReport.analysisReportSetup.analysisItemId;
        }
    } else if (accountReport.reportType == 'accountSavings') {
        if (!accountReport.accountSavingsReportSetup.analysisItemId) {
            errors.analysisHasErrors = true;
        } else {
            linkedAnalysisItemId = accountReport.accountSavingsReportSetup.analysisItemId;
        }
    }
    if (!errors.analysisHasErrors && linkedAnalysisItemId) {
        //check if analysis has errors
        let analysisItemErrors: AccountAnalysisSetupErrors = accountAnalysisSetupErrors.find(error => error.analysisId == linkedAnalysisItemId);
        if(!analysisItemErrors) {
            errors.analysisHasErrors = true;
        } else {
            errors.analysisHasErrors = analysisItemErrors.hasError;
        }
    }

    errors.hasErrors = errors.missingName ||
        errors.missingReportType ||
        errors.missingReportYear ||
        errors.missingBaselineYear ||
        errors.missingStartDate ||
        errors.missingEndDate ||
        errors.invalidDateRange ||
        errors.baselineAfterReportYear ||
        errors.analysisHasErrors;
    return errors;
}

export function emptyAccountReportErrors(): AccountReportErrors {
    return {
        reportId: '',
        hasErrors: false,
        missingName: false,
        missingReportType: false,
        missingReportYear: false,
        missingBaselineYear: false,
        missingStartDate: false,
        missingEndDate: false,
        invalidDateRange: false,
        baselineAfterReportYear: false,
        analysisHasErrors: false
    }
}
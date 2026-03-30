
export interface GroupAnalysisErrors {
    groupId: string,
    hasErrors: boolean,
    missingProductionVariables: boolean,
    missingRegressionConstant: boolean,
    missingRegressionModelYear: boolean,
    missingRegressionModelStartMonth: boolean,
    missingRegressionStartYear: boolean,
    missingRegressionModelEndMonth: boolean,
    missingRegressionEndYear: boolean,
    invalidModelDateSelection: boolean,
    missingRegressionModelSelection: boolean,
    missingRegressionPredictorCoef: boolean,
    noProductionVariables: boolean,
    invalidAverageBaseload: boolean,
    invalidMonthlyBaseload: boolean,
    missingGroupMeters: boolean,
    hasInvalidRegressionModel: boolean,
    missingBankingBaselineYear: boolean,
    missingBankingAppliedYear: boolean,
    invalidBankingYears: boolean,
    hasSetupErrors: boolean,
    hasRegressionErrors: boolean,
    hasInvalidUserDefinedModel: boolean,

    isDateRangeValid: boolean,
    isTwelveMonthSelected: boolean,
    allMeterReadingsPresent: boolean,
    allPredictorReadingsPresent: boolean
}

export interface AnalysisSetupErrors {
    hasError: boolean,
    setupHasError: boolean,
    missingName: boolean,
    noGroups: boolean,
    groupsHaveErrors: boolean,
    missingBaselineYear: boolean,
    baselineYearAfterMeterDataEnd: boolean,
    baselineYearBeforeMeterDataStart: boolean,
    bankingError: boolean,
    groupErrors: Array<GroupAnalysisErrors>
}

export interface AccountReportErrors {
    reportId: string;
    hasErrors: boolean;
    missingName: boolean;
    missingReportType: boolean;
    missingReportYear: boolean;
    missingBaselineYear: boolean;
    missingStartDate: boolean;
    missingEndDate: boolean;
    invalidDateRange: boolean;
    baselineAfterReportYear: boolean;
    analysisHasErrors: boolean;
}

export interface FacilityReportErrors {
    hasErrors: boolean,
    missingName: boolean,
    missingBaselineYear: boolean,
    missingReportYear: boolean,
    missingStartDate: boolean,
    missingEndDate: boolean,
    invalidDateRange: boolean,
    baselineAfterReportYear: boolean,
    analysisHasErrors: boolean
}
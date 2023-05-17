
export interface AccountAnalysisSetupErrors {
    hasError: boolean,
    missingName: boolean,
    noGroups: boolean,
    missingReportYear: boolean,
    missingBaselineYear: boolean,
    reportYearBeforeBaselineYear: boolean,
}

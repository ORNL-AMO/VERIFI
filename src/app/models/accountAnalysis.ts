
export interface AccountAnalysisSetupErrors {
    hasError: boolean,
    missingName: boolean,
    missingReportYear: boolean,
    missingBaselineYear: boolean,
    reportYearBeforeBaselineYear: boolean,
    facilitiesSelectionsInvalid: boolean
}

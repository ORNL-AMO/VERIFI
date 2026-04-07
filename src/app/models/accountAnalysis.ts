
export interface AccountAnalysisSetupErrors {
    analysisId: string,
    accountId: string,
    hasError: boolean,
    hasSetupErrors: boolean,
    missingName: boolean,
    missingBaselineYear: boolean,
    facilitiesSelectionsInvalid: boolean
}

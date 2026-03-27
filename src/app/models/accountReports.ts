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
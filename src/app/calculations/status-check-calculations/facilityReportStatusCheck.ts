import { IdbFacilityReport } from "src/app/models/idbModels/facilityReport";
import { AnalysisStatusCheck } from "./analysisStatusCheck";
import { FacilityReportErrors } from "src/app/models/validation";
import { getFacilityReportErrors } from "./validation/facilityReportValidation";
import { STATUS_CHECK_OPTIONS } from "./statusCheckModels";


export class FacilityReportStatusCheck {

    guid: string;
    errors: FacilityReportErrors;
    status: STATUS_CHECK_OPTIONS;
    constructor(report: IdbFacilityReport, analysisStatusChecks: Array<AnalysisStatusCheck>) {
        this.guid = report.guid;
        this.setErrors(report, analysisStatusChecks);
        this.setStatus(report, analysisStatusChecks);
    }

    setErrors(report: IdbFacilityReport, analysisStatusChecks: Array<AnalysisStatusCheck>) {
        this.errors = getFacilityReportErrors(report, analysisStatusChecks.map(check => check.analysisSetupErrors));
    }

    setStatus(report: IdbFacilityReport, analysisStatusChecks: Array<AnalysisStatusCheck>) {
        if (this.errors.hasErrors) {
            this.status = 'error';
        } else {
            const analysisStatusCheck = this.getAnalysisStatusCheck(report, analysisStatusChecks);
            if (analysisStatusCheck?.status === 'warning') {
                this.status = 'warning';
            } else {
                this.status = 'good';
            }
        }
    }

    getAnalysisStatusCheck(report: IdbFacilityReport, analysisStatusChecks: Array<AnalysisStatusCheck>): AnalysisStatusCheck | undefined {
        if (report.facilityReportType === 'emissionFactors' || report.facilityReportType === 'overview') {
            return undefined;
        } else {
            return analysisStatusChecks.find(asc => asc.analysisItem.guid === report.analysisItemId);
        }
    }
}
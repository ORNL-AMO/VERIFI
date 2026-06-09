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
        this.setStatus();
    }

    setErrors(report: IdbFacilityReport, analysisStatusChecks: Array<AnalysisStatusCheck>) {
        this.errors = getFacilityReportErrors(report, analysisStatusChecks.map(check => check.analysisSetupErrors));
    }

    setStatus() {
        if (this.errors.hasErrors) {
            this.status = 'error';
        } else {
            this.status = 'good';
        }
    }
}
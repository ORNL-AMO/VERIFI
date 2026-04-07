import { Injectable } from "@angular/core";
import { AnalysisSetupErrors, FacilityReportErrors } from "src/app/models/validation";
import { BehaviorSubject } from "rxjs";
import { FacilityReportsDbService } from "src/app/indexedDB/facility-reports-db.service";
import { AnalysisValidationService } from "./analysis-validation.service";
import { IdbFacilityReport } from "src/app/models/idbModels/facilityReport";
import { emptyFacilityReportErrors, getFacilityReportErrors } from "../facilityReportValidation";

@Injectable({
    providedIn: 'root'
})
export class FacilityReportValidationService {


    facilityReportErrors: BehaviorSubject<Array<FacilityReportErrors>> = new BehaviorSubject<Array<FacilityReportErrors>>([]);
    constructor(private facilityReportDbService: FacilityReportsDbService,
        private analysisValidationService: AnalysisValidationService
    ) {
        this.analysisValidationService.analysisSetupErrors.subscribe(setupErrors => {
            this.setFacilityReportErrors();
        });

        this.facilityReportDbService.accountFacilityReports.subscribe(facilityReports => {
            this.setFacilityReportErrors();
        });

    }

    setFacilityReportErrors() {
        let accountFacilityReports: Array<IdbFacilityReport> = this.facilityReportDbService.accountFacilityReports.getValue();
        let analysisSetupErrors: Array<AnalysisSetupErrors> = this.analysisValidationService.analysisSetupErrors.getValue();
        let allReportErrors: Array<FacilityReportErrors> = [];
        if (accountFacilityReports.length != 0 && analysisSetupErrors.length != 0) {
            accountFacilityReports.forEach(facilityReport => {
                let reportErrors: FacilityReportErrors = getFacilityReportErrors(facilityReport, analysisSetupErrors);
                allReportErrors.push(reportErrors);
            });
            this.facilityReportErrors.next(allReportErrors);
        }
    }

    getErrorsByReportId(reportId: string): FacilityReportErrors {
        let allReportErrors: Array<FacilityReportErrors> = this.facilityReportErrors.getValue();
        let reportErrors: FacilityReportErrors = allReportErrors.find(error => error.reportId == reportId);
        if (reportErrors) {
            return reportErrors;
        } else {
            return emptyFacilityReportErrors();
        }
    }
}
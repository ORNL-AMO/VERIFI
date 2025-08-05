import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Injectable({
  providedIn: 'root'
})
export class FacilityReportsService {


  errorMessage: BehaviorSubject<string>;
  constructor(private facilityReportDbService: FacilityReportsDbService) {
    this.errorMessage = new BehaviorSubject<string>(undefined);

    this.facilityReportDbService.selectedReport.subscribe(report => {
      this.validateReport(report);
    });
  }

  validateReport(report: IdbFacilityReport) {
    let errorMessage: string = undefined;
    if (report) {
      //write validation for report
      let startDate: Date = new Date(report.dataOverviewReportSettings.startYear, report.dataOverviewReportSettings.startMonth, 1);
      let endDate: Date = new Date(report.dataOverviewReportSettings.endYear, report.dataOverviewReportSettings.endMonth, 1);
      // compare start and end date
      if (startDate.getTime() >= endDate.getTime()) {
        errorMessage = 'Start date cannot be later than the end date.';
      }
    }
    this.errorMessage.next(errorMessage)
  }
}

import { Component, Input } from '@angular/core';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport, IdbFacility } from 'src/app/models/idb';
import { getNAICS } from 'src/app/shared/form-data/naics-data';

@Component({
  selector: 'app-facility-title-page',
  templateUrl: './facility-title-page.component.html',
  styleUrls: ['./facility-title-page.component.css']
})
export class FacilityTitlePageComponent {
  @Input()
  facility: IdbFacility;

  naics: string;
  dateRange: {startDate: Date, endDate: Date};
  currentDate: Date = new Date();
  constructor(private accountReportDbService: AccountReportDbService) {

  }

  ngOnInit() {
    this.naics = getNAICS(this.facility);   
     let report: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    this.dateRange = {
      startDate: new Date(report.startYear, report.startMonth, 1),
      endDate: new Date(report.endYear, report.endMonth, 1)
    };
  }

}

import { Component } from '@angular/core';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccountReport } from 'src/app/models/idb';

@Component({
  selector: 'app-data-overview-report',
  templateUrl: './data-overview-report.component.html',
  styleUrls: ['./data-overview-report.component.css']
})
export class DataOverviewReportComponent {

  calculating: boolean = false;
  selectedReport: IdbAccountReport;
  print: boolean = false;

  constructor(private accountReportDbService: AccountReportDbService) {

  }

  ngOnInit() {
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
  }
}

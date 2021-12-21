import { Component, OnInit } from '@angular/core';
import { OverviewReportService, ReportOptions } from '../overview-report.service';

@Component({
  selector: 'app-overview-report-menu',
  templateUrl: './overview-report-menu.component.html',
  styleUrls: ['./overview-report-menu.component.css']
})
export class OverviewReportMenuComponent implements OnInit {

  reportOptions: ReportOptions;
  constructor(private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.reportOptions = this.overviewReportService.reportOptions.getValue();
  }

  save() {
    this.overviewReportService.reportOptions.next(this.reportOptions);
  }

  close(){
    this.overviewReportService.showReportMenu.next(false);
  }
}

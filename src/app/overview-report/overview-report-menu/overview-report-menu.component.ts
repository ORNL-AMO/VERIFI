import { Component, OnInit } from '@angular/core';
import { OverviewReportService, ReportOptions, ReportUtilityOptions } from '../overview-report.service';

@Component({
  selector: 'app-overview-report-menu',
  templateUrl: './overview-report-menu.component.html',
  styleUrls: ['./overview-report-menu.component.css']
})
export class OverviewReportMenuComponent implements OnInit {

  reportOptions: ReportOptions;
  reportUtilityOptions: ReportUtilityOptions;
  constructor(private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.reportOptions = this.overviewReportService.reportOptions.getValue();
    this.reportUtilityOptions = this.overviewReportService.reportUtilityOptions.getValue();
  }

  save() {
    this.overviewReportService.reportOptions.next(this.reportOptions);
  }

  saveUtilityOptions(){
    this.overviewReportService.reportUtilityOptions.next(this.reportUtilityOptions);
  }

  close(){
    this.overviewReportService.showReportMenu.next(false);
  }
}

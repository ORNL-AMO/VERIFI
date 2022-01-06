import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReportOptions, ReportUtilityOptions } from 'src/app/models/overview-report';
import { OverviewReportService } from '../overview-report.service';

@Component({
  selector: 'app-overview-report-menu',
  templateUrl: './overview-report-menu.component.html',
  styleUrls: ['./overview-report-menu.component.css']
})
export class OverviewReportMenuComponent implements OnInit {

  reportOptions: ReportOptions;
  reportUtilityOptions: ReportUtilityOptions;
  constructor(private overviewReportService: OverviewReportService, private router: Router) { }

  ngOnInit(): void {
    this.reportOptions = this.overviewReportService.reportOptions.getValue();
    this.reportUtilityOptions = this.overviewReportService.reportUtilityOptions.getValue();
  }

  save() {
    this.overviewReportService.reportOptions.next(this.reportOptions);
  }

  saveUtilityOptions() {
    this.overviewReportService.reportUtilityOptions.next(this.reportUtilityOptions);
  }

  goToReport() {
    this.router.navigateByUrl('/overview-report/basic-report');
    // this.overviewReportService.reportView.next('dashboard');
  }

  goToDashboard() {
    this.router.navigateByUrl('/overview-report/report-dashboard');
  }
}

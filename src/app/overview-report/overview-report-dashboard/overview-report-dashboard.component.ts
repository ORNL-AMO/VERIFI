import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { IdbOverviewReportOptions } from 'src/app/models/idb';
import { ReportOptions, ReportUtilityOptions } from 'src/app/models/overview-report';
import { OverviewReportService } from '../overview-report.service';

@Component({
  selector: 'app-overview-report-dashboard',
  templateUrl: './overview-report-dashboard.component.html',
  styleUrls: ['./overview-report-dashboard.component.css']
})
export class OverviewReportDashboardComponent implements OnInit {

  accountOverviewReportOptions: Array<IdbOverviewReportOptions>;
  accountOverviewReportOptionsSub: Subscription;
  reportToDelete: IdbOverviewReportOptions;
  constructor(private overviewReportService: OverviewReportService, private router: Router, private overviewReportOptionsDbService: OverviewReportOptionsDbService) { }

  ngOnInit(): void {
    this.accountOverviewReportOptionsSub = this.overviewReportOptionsDbService.accountOverviewReportOptions.subscribe(options => {
      this.accountOverviewReportOptions = options;
    });
  }

  ngOnDestory() {
    this.accountOverviewReportOptionsSub.unsubscribe();
  }

  createReport() {
    this.overviewReportOptionsDbService.selectedOverviewReportOptions.next(undefined);
    let newReportOptions: ReportOptions = this.overviewReportService.getInitialReportOptions();
    let newReportUtilityOptions: ReportUtilityOptions = this.overviewReportService.getInitialUtilityOptions();
    this.overviewReportService.reportOptions.next(newReportOptions);
    this.overviewReportService.reportUtilityOptions.next(newReportUtilityOptions);
    this.router.navigateByUrl('/overview-report/report-menu');
  }

  selectReport(report: IdbOverviewReportOptions) {
    this.overviewReportOptionsDbService.selectedOverviewReportOptions.next(report);
    this.overviewReportService.reportOptions.next(report.reportOptions);
    this.overviewReportService.reportUtilityOptions.next(report.reportUtilityOptions);
    this.router.navigateByUrl('/overview-report/basic-report');
  }

  deleteReport(report: IdbOverviewReportOptions) {
    this.reportToDelete = report;
  }

  cancelDelete() {
    this.reportToDelete = undefined;
  }

  async confirmDelete() {
    await this.overviewReportOptionsDbService.deleteWithObservable(this.reportToDelete.id).toPromise();
    this.overviewReportOptionsDbService.setAccountOverviewReportOptions();
    this.reportToDelete = undefined;
  }

  editReport(report: IdbOverviewReportOptions) {
    this.overviewReportOptionsDbService.selectedOverviewReportOptions.next(report);
    this.overviewReportService.reportOptions.next(report.reportOptions);
    this.overviewReportService.reportUtilityOptions.next(report.reportUtilityOptions);
    this.router.navigateByUrl('/overview-report/report-menu');
  }
}

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { IdbOverviewReportOptions } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';
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

  currentPageNumber: number = 1;
  itemsPerPage: number = 10;
  orderDataField: string = 'name';
  orderByDirection: string = 'desc';
  constructor(private overviewReportService: OverviewReportService, private router: Router, private overviewReportOptionsDbService: OverviewReportOptionsDbService) { }

  ngOnInit(): void {
    this.accountOverviewReportOptionsSub = this.overviewReportOptionsDbService.accountOverviewReportOptions.subscribe(options => {
      this.accountOverviewReportOptions = this.setOptions(options);
    });
  }

  ngOnDestory() {
    this.accountOverviewReportOptionsSub.unsubscribe();
  }

  setOptions(options: Array<IdbOverviewReportOptions>): Array<IdbOverviewReportOptions> {
    //used for ordering table
    options.forEach(option => {
      option.baselineYear = option.reportOptions.baselineYear;
      option.targetYear = option.reportOptions.targetYear;
      option.title = option.reportOptions.title
    });
    return options;
  }


  createReport() {
    this.overviewReportOptionsDbService.selectedOverviewReportOptions.next(undefined);
    let newReportOptions: ReportOptions = this.overviewReportService.getInitialReportOptions();
    this.overviewReportService.reportOptions.next(newReportOptions);
    this.router.navigateByUrl('/overview-report/report-menu');
  }

  selectReport(report: IdbOverviewReportOptions) {
    this.overviewReportOptionsDbService.selectedOverviewReportOptions.next(report);
    this.overviewReportService.reportOptions.next(report.reportOptions);
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
    this.router.navigateByUrl('/overview-report/report-menu');
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }
}

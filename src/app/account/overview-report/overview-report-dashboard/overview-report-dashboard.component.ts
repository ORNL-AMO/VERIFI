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
  showNewReportModal: boolean = false;
  reportType: 'data' | 'betterPlants' = 'betterPlants';
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
      option.title = option.reportOptions.title,
      option.reportOptionsType = option.reportOptions.reportType
    });
    return options;
  }


  // createReport() {
  //   this.overviewReportOptionsDbService.selectedOverviewReportOptions.next(undefined);
  //   let newReportOptions: ReportOptions = this.overviewReportService.getInitialReportOptions();
  //   this.overviewReportService.reportOptions.next(newReportOptions);
  //   this.router.navigateByUrl('/account/reports/report-type');
  // }

  selectReport(report: IdbOverviewReportOptions) {
    this.overviewReportOptionsDbService.selectedOverviewReportOptions.next(report);
    this.overviewReportService.reportOptions.next(report.reportOptions);
    if(report.reportOptions.reportType == 'data'){
      this.router.navigateByUrl('/account/reports/basic-report');
    }else if(report.reportOptions.reportType == 'betterPlants'){
      this.router.navigateByUrl('/account/reports/better-plants-report');
    }
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
    if(report.reportOptions.reportType == 'data'){
      this.router.navigateByUrl('/account/reports/menu');
    }else if(report.reportOptions.reportType == 'betterPlants'){
      this.router.navigateByUrl('/account/reports/better-plants-menu');
    }
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


  openAddNewReportModal() {
    this.showNewReportModal = true;
  }

  createNewReport() {
    this.overviewReportOptionsDbService.selectedOverviewReportOptions.next(undefined);
    let newReportOptions: ReportOptions = this.overviewReportService.getInitialReportOptions(this.reportType);
    this.overviewReportService.reportOptions.next(newReportOptions);
    if (this.reportType == 'betterPlants') {
      this.router.navigateByUrl('/account/reports/better-plants-menu');
    } else {
      this.router.navigateByUrl('/account/reports/menu');
    }
  }

  cancelNewReport() {
    this.showNewReportModal = false;
  }

  setReportType(reportType: 'betterPlants' | 'data') {
    this.reportType = reportType;
  }
}

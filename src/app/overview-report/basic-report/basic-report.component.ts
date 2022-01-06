import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { IdbOverviewReportOptions } from 'src/app/models/idb';
import { ReportOptions, ReportUtilityOptions } from 'src/app/models/overview-report';
import { OverviewReportService } from '../overview-report.service';

@Component({
  selector: 'app-basic-report',
  templateUrl: './basic-report.component.html',
  styleUrls: ['./basic-report.component.css']
})
export class BasicReportComponent implements OnInit {

  reportOptions: ReportOptions;
  reportOptionsSub: Subscription;
  printSub: Subscription;
  print: boolean;
  reportUtilityOptions: ReportUtilityOptions;
  reportUtilityOptionsSub: Subscription;
  constructor(private overviewReportService: OverviewReportService, private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private router: Router) { }

  ngOnInit(): void {
    this.reportOptionsSub = this.overviewReportService.reportOptions.subscribe(reportOptions => {
      this.reportOptions = reportOptions;
      if (!this.reportOptions) {
        this.checkReportOptions();
      }
    });
    this.printSub = this.overviewReportService.print.subscribe(print => {
      this.print = print;
      if (this.print) {
        this.printReport();
      }
    });

    this.reportUtilityOptionsSub = this.overviewReportService.reportUtilityOptions.subscribe(reportUtilityOptions => {
      this.reportUtilityOptions = reportUtilityOptions;
    })
  }

  ngOnDestroy() {
    this.reportOptionsSub.unsubscribe();
    this.printSub.unsubscribe();
    this.reportUtilityOptionsSub.unsubscribe();
  }

  printReport() {
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      setTimeout(() => {
        window.print();
        this.overviewReportService.print.next(false)
      }, 100)
    }, 100)
  }

  checkReportOptions() {
    let selectedOptions: IdbOverviewReportOptions = this.overviewReportOptionsDbService.selectedOverviewReportOptions.getValue();
    if (selectedOptions) {
      this.overviewReportService.reportUtilityOptions.next(selectedOptions.reportUtilityOptions);
      this.overviewReportService.reportOptions.next(selectedOptions.reportOptions);
    } else {
      this.router.navigateByUrl('/overview-report/report-dashboard');
    }
  }

}

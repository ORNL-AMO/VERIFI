import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReportOptions, ReportUtilityOptions } from '../models/overview-report';
import { OverviewReportService } from './overview-report.service';

@Component({
  selector: 'app-overview-report',
  templateUrl: './overview-report.component.html',
  styleUrls: ['./overview-report.component.css']
})
export class OverviewReportComponent implements OnInit {

  showReportMenu: boolean;
  showReportMenuSub: Subscription;
  reportOptions: ReportOptions;
  reportOptionsSub: Subscription;
  printSub: Subscription;
  print: boolean;
  reportUtilityOptions: ReportUtilityOptions;
  reportUtilityOptionsSub: Subscription;
  constructor(private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.overviewReportService.initializeOptions();

    this.showReportMenuSub = this.overviewReportService.showReportMenu.subscribe(showReportMenu => {
      this.showReportMenu = showReportMenu;
    });

    this.reportOptionsSub = this.overviewReportService.reportOptions.subscribe(reportOptions => {
      this.reportOptions = reportOptions;
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
    this.showReportMenuSub.unsubscribe();
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

}

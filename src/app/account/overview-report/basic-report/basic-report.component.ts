import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { IdbAccount, IdbOverviewReportOptions } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';
import { OverviewReportService } from '../overview-report.service';

@Component({
  selector: 'app-basic-report',
  templateUrl: './basic-report.component.html',
  styleUrls: ['./basic-report.component.css']
})
export class BasicReportComponent implements OnInit {

  reportOptions: ReportOptions;
  printSub: Subscription;
  print: boolean;
  account: IdbAccount;
  constructor(private overviewReportService: OverviewReportService, private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private router: Router, private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.printSub = this.overviewReportService.print.subscribe(print => {
      this.print = print;
      if (this.print) {
        this.printReport();
      }
    });
    this.account = this.accountDbService.selectedAccount.getValue();
    this.reportOptions = this.overviewReportService.reportOptions.getValue();
    if (!this.reportOptions) {
      let selectedOptions: IdbOverviewReportOptions = this.overviewReportOptionsDbService.selectedOverviewReportOptions.getValue()
      if (selectedOptions) {
        this.reportOptions = selectedOptions.reportOptions;
      } else {
        this.router.navigateByUrl('/overview-report/report-dashboard');
      }
    }
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
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

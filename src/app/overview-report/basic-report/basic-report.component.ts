import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { IdbAccount, IdbOverviewReportOptions } from 'src/app/models/idb';
import { ReportOptions, ReportUtilityOptions } from 'src/app/models/overview-report';
import { LoadingService } from 'src/app/shared/loading/loading.service';
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
  reportUtilityOptions: ReportUtilityOptions;
  account: IdbAccount;
  constructor(private overviewReportService: OverviewReportService, private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private router: Router, private loadingService: LoadingService, private accountDbService: AccountdbService) { }

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
        this.reportUtilityOptions = selectedOptions.reportUtilityOptions;
      } else {
        this.router.navigateByUrl('/overview-report/report-dashboard');
      }
    } else {
      this.reportUtilityOptions = this.overviewReportService.reportUtilityOptions.getValue();
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

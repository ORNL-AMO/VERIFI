import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { AccountReportsService } from '../../account-reports.service';
import { DataOverviewAccount } from '../data-overview-report.component';

@Component({
    selector: 'app-data-overview-account-report',
    templateUrl: './data-overview-account-report.component.html',
    styleUrls: ['./data-overview-account-report.component.css'],
    standalone: false
})
export class DataOverviewAccountReportComponent {
  @Input()
  overviewReport: DataOverviewReportSetup;
  @Input()
  accountData: DataOverviewAccount;


  print: boolean = false;
  printSub: Subscription;
  constructor(private accountReportsService: AccountReportsService) {
  }

  ngOnInit() {
    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
    });
  }

  ngOnDestroy(){
    this.printSub.unsubscribe();
  }
}

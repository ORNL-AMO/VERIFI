import { Component, Input } from '@angular/core';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { DataOverviewAccount } from '../data-overview-report.component';

@Component({
  selector: 'app-data-overview-account-report',
  templateUrl: './data-overview-account-report.component.html',
  styleUrls: ['./data-overview-account-report.component.css']
})
export class DataOverviewAccountReportComponent {
  @Input()
  overviewReport: DataOverviewReportSetup;
  @Input()
  accountData: DataOverviewAccount;


  constructor() {
  }

  ngOnInit() {

  }
}

import { Component, Input, OnInit } from '@angular/core';
import { IdbAccount } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';
import { OverviewReportService } from '../../../overview-report.service';

@Component({
  selector: 'app-account-report-info',
  templateUrl: './account-report-info.component.html',
  styleUrls: ['./account-report-info.component.css']
})
export class AccountReportInfoComponent implements OnInit {
  @Input()
  account: IdbAccount;
  @Input()
  reportOptions: ReportOptions;

  naics: string;
  constructor(private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.naics = this.overviewReportService.getNAICS(this.account);
  }
}

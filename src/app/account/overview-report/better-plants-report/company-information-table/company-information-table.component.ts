import { Component, Input, OnInit } from '@angular/core';
import { IdbAccount } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';
import { OverviewReportService } from '../../overview-report.service';

@Component({
  selector: 'app-company-information-table',
  templateUrl: './company-information-table.component.html',
  styleUrls: ['./company-information-table.component.css']
})
export class CompanyInformationTableComponent implements OnInit {
  @Input()
  reportOptions: ReportOptions;
  @Input()
  account: IdbAccount;
  
  naics: string;
  constructor(private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.naics = this.overviewReportService.getNAICS(this.account);
  }

}

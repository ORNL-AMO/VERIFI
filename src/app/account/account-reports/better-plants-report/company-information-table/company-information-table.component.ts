import { Component, Input, OnInit } from '@angular/core';
import { OverviewReportService } from 'src/app/account/overview-report/overview-report.service';
import { IdbAccount } from 'src/app/models/idb';

@Component({
  selector: 'app-company-information-table',
  templateUrl: './company-information-table.component.html',
  styleUrls: ['./company-information-table.component.css']
})
export class CompanyInformationTableComponent implements OnInit {
  @Input()
  account: IdbAccount;
  
  naics: string;
  constructor(private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.naics = this.overviewReportService.getNAICS(this.account);
  }

}

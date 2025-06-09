import { Component, Input } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
  selector: 'app-company-information-table',
  templateUrl: './company-information-table.component.html',
  styleUrls: ['./company-information-table.component.css'],
  standalone: false
})
export class CompanyInformationTableComponent {
  @Input()
  account: IdbAccount;
  selectedReport: IdbAccountReport;
  constructor(private accountReportDbService: AccountReportDbService) { }
  ngOnInit() {
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
  }
}




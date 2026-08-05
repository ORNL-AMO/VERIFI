import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, Input, inject } from '@angular/core';
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
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  @Input()
  account: IdbAccount;
  selectedReport: IdbAccountReport;
  constructor(private accountReportDbService: AccountReportDbService) { }
  ngOnInit() {
    this.selectedReport = this.accountWorkspaceStore.selectedAccountReport();
  }
}




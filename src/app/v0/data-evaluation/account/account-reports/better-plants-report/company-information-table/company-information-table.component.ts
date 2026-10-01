import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, Input, inject } from '@angular/core';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';

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
  ngOnInit() {
    this.selectedReport = this.accountWorkspaceStore.selectedAccountReport();
  }
}




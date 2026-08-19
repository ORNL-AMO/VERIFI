import { AccountWorkspaceStore } from '@app/account-workspace/account-workspace.store';
import { Component, Input, inject } from '@angular/core';
import { BetterClimateYearDetails } from '@app/calculations/carbon-calculations/betterClimateYearsDetails';
import { IdbAccount } from '@app/models/idbModels/account';
import { IdbAccountReport } from '@app/models/idbModels/accountReport';

@Component({
  selector: 'app-portfolio-information-table',
  templateUrl: './portfolio-information-table.component.html',
  styleUrls: ['./portfolio-information-table.component.css'],
  standalone: false
})
export class PortfolioInformationTableComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;
  @Input()
  account: IdbAccount;
  selectedReport: IdbAccountReport;


  ngOnInit(): void {
    this.selectedReport = this.accountWorkspaceStore.selectedAccountReport();
  }
}

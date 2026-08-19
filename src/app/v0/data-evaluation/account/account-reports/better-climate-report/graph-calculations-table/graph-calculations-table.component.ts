import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, Input, inject } from '@angular/core';
import { BetterClimateYearDetails } from '@domain/calculations/carbon-calculations/betterClimateYearsDetails';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { BetterClimateReportSetup } from '@data/models/overview-report';

@Component({
  selector: 'app-graph-calculations-table',
  templateUrl: './graph-calculations-table.component.html',
  styleUrls: ['./graph-calculations-table.component.css'],
  standalone: false
})
export class GraphCalculationsTableComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;
  @Input()
  account: IdbAccount;
  @Input()
  betterClimateReportSetup: BetterClimateReportSetup;
  selectedReport: IdbAccountReport;


  ngOnInit(): void {
    this.selectedReport = this.accountWorkspaceStore.selectedAccountReport();
  }
}

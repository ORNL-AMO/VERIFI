import { AccountWorkspaceStore } from '@app/account-workspace/account-workspace.store';
import { Component, Input, inject } from '@angular/core';
import { BetterClimateYearDetails } from '@app/calculations/carbon-calculations/betterClimateYearsDetails';
import { IdbAccount } from '@app/models/idbModels/account';
import { IdbAccountReport } from '@app/models/idbModels/accountReport';
import { BetterClimateReportSetup } from '@app/models/overview-report';

@Component({
  selector: 'app-emissions-reductions-table',
  templateUrl: './emissions-reductions-table.component.html',
  styleUrls: ['./emissions-reductions-table.component.css'],
  standalone: false
})
export class EmissionsReductionsTableComponent {
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

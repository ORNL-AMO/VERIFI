import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, Input, inject } from '@angular/core';
import { BetterClimateYearDetails } from '@domain/calculations/carbon-calculations/betterClimateYearsDetails';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { BetterClimateReportSetup } from '@data/models/overview-report';

@Component({
  selector: 'app-total-portfolio-energy-use-table',
  templateUrl: './total-portfolio-energy-use-table.component.html',
  styleUrls: ['./total-portfolio-energy-use-table.component.css'],
  standalone: false
})
export class TotalPortfolioEnergyUseTableComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;
  @Input()
  tableType: 'total' | 'stationary';
  @Input()
  betterClimateReportSetup: BetterClimateReportSetup;
  @Input()
  showTitle: boolean = false;
  selectedReport: IdbAccountReport;


  ngOnInit(): void {
    this.selectedReport = this.accountWorkspaceStore.selectedAccountReport();
  }
}

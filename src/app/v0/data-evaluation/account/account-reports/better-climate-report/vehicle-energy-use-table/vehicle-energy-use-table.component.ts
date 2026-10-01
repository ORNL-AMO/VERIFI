import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, Input, inject } from '@angular/core';
import { BetterClimateYearDetails } from '@domain/calculations/carbon-calculations/betterClimateYearsDetails';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { BetterClimateReportSetup } from '@data/models/overview-report';

@Component({
  selector: 'app-vehicle-energy-use-table',
  templateUrl: './vehicle-energy-use-table.component.html',
  styleUrls: ['./vehicle-energy-use-table.component.css'],
  standalone: false
})
export class VehicleEnergyUseTableComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;
  @Input()
  betterClimateReportSetup: BetterClimateReportSetup;
  selectedReport: IdbAccountReport;


  ngOnInit(): void {
    this.selectedReport = this.accountWorkspaceStore.selectedAccountReport();
  }
}

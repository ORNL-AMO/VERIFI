import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { BetterClimateReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-emissions-reductions-table',
  templateUrl: './emissions-reductions-table.component.html',
  styleUrls: ['./emissions-reductions-table.component.css'],
  standalone: false
})
export class EmissionsReductionsTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;
  @Input()
  account: IdbAccount;
  @Input()
  betterClimateReportSetup: BetterClimateReportSetup;

}

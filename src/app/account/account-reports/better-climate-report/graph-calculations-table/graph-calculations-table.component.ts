import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { BetterClimateReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-graph-calculations-table',
  templateUrl: './graph-calculations-table.component.html',
  styleUrls: ['./graph-calculations-table.component.css'],
  standalone: false
})
export class GraphCalculationsTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;
  @Input()
  account: IdbAccount;
  @Input()
  betterClimateReportSetup: BetterClimateReportSetup;

}

import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { IdbAccount } from 'src/app/models/idb';
import { BetterClimateReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-absolute-emissions-table',
  templateUrl: './absolute-emissions-table.component.html',
  styleUrls: ['./absolute-emissions-table.component.css']
})
export class AbsoluteEmissionsTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;
  @Input()
  account: IdbAccount;
  @Input()
  betterClimateReportSetup: BetterClimateReportSetup;

}

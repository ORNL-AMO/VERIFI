import { Component, Input } from '@angular/core';
import { BetterClimateYearDetails } from 'src/app/calculations/carbon-calculations/betterClimateYearsDetails';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
    selector: 'app-portfolio-information-table',
    templateUrl: './portfolio-information-table.component.html',
    styleUrls: ['./portfolio-information-table.component.css'],
    standalone: false
})
export class PortfolioInformationTableComponent {
  @Input()
  yearDetails: Array<BetterClimateYearDetails>;
  @Input()
  cellWidth: number;
  @Input()
  account: IdbAccount;

}

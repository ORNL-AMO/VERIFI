import { Component, Input } from '@angular/core';
import { IUseAndCost, UseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';

@Component({
  selector: 'app-costs-consumption-table',
  templateUrl: './costs-consumption-table.component.html',
  styleUrls: ['./costs-consumption-table.component.css']
})
export class CostsConsumptionTableComponent {
  @Input()
  facilityId: string;
  @Input()
  sourcesUseAndCost: Array<UseAndCost>;
  @Input()
  useAndCostTotal: {
      average: IUseAndCost;
      end: IUseAndCost
      previousYear: IUseAndCost;
  };
  @Input()
  dateRange: {startDate: Date, endDate: Date};
  @Input()
  previousYear: Date;

}

import { Component, Input } from '@angular/core';
import { IUseAndCost, UseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';

@Component({
  selector: 'app-water-consumption-table',
  templateUrl: './water-consumption-table.component.html',
  styleUrls: ['./water-consumption-table.component.css']
})
export class WaterConsumptionTableComponent {
  @Input()
  facilityId: string;
  @Input()
  waterUnit: string;
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

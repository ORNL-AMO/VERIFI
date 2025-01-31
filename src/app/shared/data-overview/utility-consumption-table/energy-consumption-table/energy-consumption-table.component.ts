import { Component, Input } from '@angular/core';
import { IUseAndCost, UseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';

@Component({
    selector: 'app-energy-consumption-table',
    templateUrl: './energy-consumption-table.component.html',
    styleUrls: ['./energy-consumption-table.component.css'],
    standalone: false
})
export class EnergyConsumptionTableComponent {
  @Input()
  facilityId: string;
  @Input()
  energyUnit: string;
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

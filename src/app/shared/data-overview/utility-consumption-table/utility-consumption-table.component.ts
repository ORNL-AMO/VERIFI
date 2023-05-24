import { Component, Input } from '@angular/core';
import { IUseAndCost, UseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';

@Component({
  selector: 'app-utility-consumption-table',
  templateUrl: './utility-consumption-table.component.html',
  styleUrls: ['./utility-consumption-table.component.css']
})
export class UtilityConsumptionTableComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  facilityId: string;
  @Input()
  energyUnit: string;
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
  dateRange: { startDate: Date, endDate: Date };
  @Input()
  previousYear: Date;
}

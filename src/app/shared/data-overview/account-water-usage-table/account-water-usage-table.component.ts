import { Component, Input, SimpleChanges } from '@angular/core';
import { AccountOverviewData, WaterTypeData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { UtilityColors } from '../../utilityColors';

@Component({
  selector: 'app-account-water-usage-table',
  templateUrl: './account-water-usage-table.component.html',
  styleUrls: ['./account-water-usage-table.component.css']
})
export class AccountWaterUsageTableComponent {
  @Input()
  accountOverviewData: AccountOverviewData;
  @Input()
  waterUnit: string;

  waterTotalsArr: Array<WaterTotalTableItem>;
  constructor() {
  }

  ngOnInit() {
    this.setTotalsArr();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.dataType && (changes.accountOverviewData && !changes.accountOverviewData.isFirstChange())) {
      this.setTotalsArr();
    }
  }

  setTotalsArr() {
    this.waterTotalsArr = new Array();
    this.accountOverviewData.waterTypeData.forEach((data, index) => {
      this.waterTotalsArr.push({
        color: data.color,
        waterType: data.waterType,
        totalConsumption: data.totalConsumption,
        totalCost: data.totalCost
      })
    })
  }

  getColor(waterType: WaterTypeData): string {
    if (waterType.isIntake) {
      return UtilityColors['Water Intake'].color
    } else {
      return UtilityColors['Water Discharge'].color
    }
  }
}


export interface WaterTotalTableItem {
  color: string,
  waterType: string;
  totalConsumption: number;
  totalCost: number
}
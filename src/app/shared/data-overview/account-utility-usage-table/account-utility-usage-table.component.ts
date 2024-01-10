import { Component, Input, SimpleChange, SimpleChanges } from '@angular/core';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { SourceTotal } from 'src/app/calculations/dashboard-calculations/sourceTotalsClass';
import { UtilityColors } from '../../utilityColors';

@Component({
  selector: 'app-account-utility-usage-table',
  templateUrl: './account-utility-usage-table.component.html',
  styleUrls: ['./account-utility-usage-table.component.css']
})
export class AccountUtilityUsageTableComponent {
  @Input()
  accountOverviewData: AccountOverviewData;
  @Input()
  energyUnit: string;

  sourceTotalsArr: Array<SourceTotalTableItem>;
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
    this.sourceTotalsArr = new Array();
    if (this.accountOverviewData.sourceTotals.electricity.energyUse) {
      this.sourceTotalsArr.push(this.getArrItem(this.accountOverviewData.sourceTotals.electricity));
    }
    if (this.accountOverviewData.sourceTotals.naturalGas.energyUse) {
      this.sourceTotalsArr.push(this.getArrItem(this.accountOverviewData.sourceTotals.naturalGas));
    }
    if (this.accountOverviewData.sourceTotals.otherFuels.energyUse) {
      this.sourceTotalsArr.push(this.getArrItem(this.accountOverviewData.sourceTotals.otherFuels));
    }
    if (this.accountOverviewData.sourceTotals.otherEnergy.energyUse) {
      this.sourceTotalsArr.push(this.getArrItem(this.accountOverviewData.sourceTotals.otherEnergy));
    }
    if (this.accountOverviewData.sourceTotals.waterIntake.energyUse) {
      this.sourceTotalsArr.push(this.getArrItem(this.accountOverviewData.sourceTotals.waterIntake));
    }
    if (this.accountOverviewData.sourceTotals.waterDischarge.energyUse) {
      this.sourceTotalsArr.push(this.getArrItem(this.accountOverviewData.sourceTotals.waterDischarge));
    }
    if (this.accountOverviewData.sourceTotals.other.energyUse) {
      this.sourceTotalsArr.push(this.getArrItem(this.accountOverviewData.sourceTotals.other));
    }
  }

  getArrItem(sourceTotal: SourceTotal): SourceTotalTableItem {
    return { ...sourceTotal, color: UtilityColors[sourceTotal.sourceLabel]?.color }
  }
}


export interface SourceTotalTableItem extends SourceTotal {
  color: string
}


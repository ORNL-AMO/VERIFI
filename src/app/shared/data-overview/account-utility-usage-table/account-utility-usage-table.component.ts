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
  @Input()
  dataType: 'energyUse' | 'cost';

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
    this.addArrItem(this.accountOverviewData.sourceTotals.electricity);
    this.addArrItem(this.accountOverviewData.sourceTotals.naturalGas);
    this.addArrItem(this.accountOverviewData.sourceTotals.otherFuels);
    this.addArrItem(this.accountOverviewData.sourceTotals.otherEnergy);
    this.addArrItem(this.accountOverviewData.sourceTotals.waterIntake);
    this.addArrItem(this.accountOverviewData.sourceTotals.waterDischarge);
    this.addArrItem(this.accountOverviewData.sourceTotals.other);
  }

  addArrItem(sourceTotal: SourceTotal) {
    if (this.dataType == 'energyUse' && sourceTotal.energyUse) {
      this.sourceTotalsArr.push({ ...sourceTotal, color: UtilityColors[sourceTotal.sourceLabel]?.color })
    } else if (this.dataType == 'cost' && sourceTotal.cost) {
      this.sourceTotalsArr.push({ ...sourceTotal, color: UtilityColors[sourceTotal.sourceLabel]?.color })
    }
  }
}

export interface SourceTotalTableItem extends SourceTotal {
  color: string
}


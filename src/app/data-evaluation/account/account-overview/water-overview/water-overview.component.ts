import { Component, OnInit } from '@angular/core';
import { AccountOverviewService } from '../account-overview.service';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';


@Component({
    selector: 'app-water-overview',
    templateUrl: './water-overview.component.html',
    styleUrls: ['./water-overview.component.css'],
    standalone: false
})
export class WaterOverviewComponent implements OnInit {

  calculatingSub: Subscription;
  calculating: boolean | 'error';
  selectedAccountSub: Subscription;
  waterUnit: string;
  
  accountOverviewDataSub: Subscription;
  accountOverviewData: AccountOverviewData;
  utilityUseAndCostSub: Subscription;
  utilityUseAndCost: UtilityUseAndCost;
  dateRangeSub: Subscription;
  dateRange: {startDate: Date, endDate: Date};
  constructor(private accountOverviewService: AccountOverviewService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      if (val) {
        this.waterUnit = val.volumeLiquidUnit;
      }
    });
    this.calculatingSub = this.accountOverviewService.calculating.subscribe(val => {
      this.calculating = val;
    })

    this.dateRangeSub = this.accountOverviewService.dateRange.subscribe(dateRange => {
      this.dateRange = dateRange;
    });

    this.accountOverviewDataSub = this.accountOverviewService.accountOverviewData.subscribe(val => {
      this.accountOverviewData = val;
    });

    this.utilityUseAndCostSub = this.accountOverviewService.utilityUseAndCost.subscribe(val => {
      this.utilityUseAndCost = val;
    });
  }

  ngOnDestroy() {
    this.calculatingSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
    this.accountOverviewDataSub.unsubscribe();
    this.utilityUseAndCostSub.unsubscribe();
    this.dateRangeSub.unsubscribe();
  }

}

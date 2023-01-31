import { Component, OnInit } from '@angular/core';
import { AccountOverviewService } from '../account-overview.service';
import { Subscription } from 'rxjs';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';


@Component({
  selector: 'app-water-overview',
  templateUrl: './water-overview.component.html',
  styleUrls: ['./water-overview.component.css']
})
export class WaterOverviewComponent implements OnInit {

  lastMonthsDate: Date;
  yearPriorDate: Date;
  accountFacilitiesSummarySub: Subscription;
  calculatingSub: Subscription;
  calculating: boolean;
  accountFacilitiesSummary: AccountFacilitiesSummary;
  selectedAccountSub: Subscription;
  waterUnit: string;
  constructor(private accountOverviewService: AccountOverviewService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      if (val) {
        this.waterUnit = val.volumeLiquidUnit;
      }
    });
    this.calculatingSub = this.accountOverviewService.calculatingWater.subscribe(val => {
      this.calculating = val;
    })

    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesWaterSummary.subscribe(accountFacilitiesSummary => {
      this.accountFacilitiesSummary = accountFacilitiesSummary;
      if (accountFacilitiesSummary.allMetersLastBill) {
        this.lastMonthsDate = new Date(accountFacilitiesSummary.allMetersLastBill.year, accountFacilitiesSummary.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(accountFacilitiesSummary.allMetersLastBill.year - 1, accountFacilitiesSummary.allMetersLastBill.monthNumValue + 1);
      } else {
        this.lastMonthsDate = undefined;
        this.yearPriorDate = undefined;
      }
    });
  }

  ngOnDestroy() {
    this.accountFacilitiesSummarySub.unsubscribe();
    this.calculatingSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }

}

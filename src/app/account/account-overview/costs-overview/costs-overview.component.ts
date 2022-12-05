import { Component, OnInit } from '@angular/core';
import { AccountOverviewService } from '../account-overview.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-costs-overview',
  templateUrl: './costs-overview.component.html',
  styleUrls: ['./costs-overview.component.css']
})
export class CostsOverviewComponent implements OnInit {

  lastMonthsDate: Date;
  yearPriorDate: Date;
  accountFacilitiesSummarySub: Subscription;
  calculatingSub: Subscription;
  calculating: boolean;
  displayWarning: boolean;
  constructor(private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    this.calculatingSub = this.accountOverviewService.calculatingCosts.subscribe(val => {
      this.calculating = val;
    })

    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesCostsSummary.subscribe(accountFacilitiesSummary => {
      if (accountFacilitiesSummary.allMetersLastBill) {
        this.displayWarning = accountFacilitiesSummary.totalEnergyCost == 0;
        this.lastMonthsDate = new Date(accountFacilitiesSummary.allMetersLastBill.year, accountFacilitiesSummary.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(accountFacilitiesSummary.allMetersLastBill.year - 1, accountFacilitiesSummary.allMetersLastBill.monthNumValue + 1);
      } else {
        this.lastMonthsDate = undefined;
        this.yearPriorDate = undefined;
      }
    });
  }

  ngOnDestroy(){
    this.accountFacilitiesSummarySub.unsubscribe();
    this.calculatingSub.unsubscribe();
  }

}

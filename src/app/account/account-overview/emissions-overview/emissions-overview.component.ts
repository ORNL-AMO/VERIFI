import { Component, OnInit } from '@angular/core';
import { AccountOverviewService } from '../account-overview.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-emissions-overview',
  templateUrl: './emissions-overview.component.html',
  styleUrls: ['./emissions-overview.component.css']
})
export class EmissionsOverviewComponent implements OnInit {

  lastMonthsDate: Date;
  yearPriorDate: Date;
  accountFacilitiesSummarySub: Subscription;
  calculatingSub: Subscription;
  calculating: boolean;
  constructor(private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {


    this.calculatingSub = this.accountOverviewService.calculatingEnergy.subscribe(val => {
      this.calculating = val;
    })


    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesEnergySummary.subscribe(accountFacilitiesSummary => {
      if (accountFacilitiesSummary.allMetersLastBill) {
        this.lastMonthsDate = new Date(accountFacilitiesSummary.allMetersLastBill.year, accountFacilitiesSummary.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(accountFacilitiesSummary.allMetersLastBill.year - 1, accountFacilitiesSummary.allMetersLastBill.monthNumValue);
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

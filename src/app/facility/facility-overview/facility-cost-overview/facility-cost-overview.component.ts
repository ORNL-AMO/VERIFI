import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityOverviewService } from '../facility-overview.service';

@Component({
  selector: 'app-facility-cost-overview',
  templateUrl: './facility-cost-overview.component.html',
  styleUrls: ['./facility-cost-overview.component.css']
})
export class FacilityCostOverviewComponent implements OnInit {

  lastMonthsDate: Date;
  yearPriorDate: Date;
  accountFacilitiesSummarySub: Subscription;
  calculatingSub: Subscription;
  calculating: boolean;
  displayWarning: boolean;
  constructor(private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.calculatingSub = this.facilityOverviewService.calculatingCosts.subscribe(val => {
      this.calculating = val;
    })

    this.accountFacilitiesSummarySub = this.facilityOverviewService.costsMeterSummaryData.subscribe(summaryData => {
      if (summaryData && summaryData.allMetersLastBill) {
        this.displayWarning = summaryData.totalEnergyCost == 0;
        this.lastMonthsDate = new Date(summaryData.allMetersLastBill.year, summaryData.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(summaryData.allMetersLastBill.year - 1, summaryData.allMetersLastBill.monthNumValue + 1);
      } else {
        this.lastMonthsDate = undefined;
        this.yearPriorDate = undefined;
      }
    });
  }

  ngOnDestroy() {
    this.accountFacilitiesSummarySub.unsubscribe();
    this.calculatingSub.unsubscribe();
  }

}

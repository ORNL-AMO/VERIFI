import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityOverviewService } from '../facility-overview.service';



@Component({
  selector: 'app-facility-energy-overview',
  templateUrl: './facility-energy-overview.component.html',
  styleUrls: ['./facility-energy-overview.component.css']
})
export class FacilityEnergyOverviewComponent implements OnInit {

  lastMonthsDate: Date;
  yearPriorDate: Date;
  accountFacilitiesSummarySub: Subscription;
  calculatingSub: Subscription;
  calculating: boolean;
  constructor(private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {


    this.calculatingSub = this.facilityOverviewService.calculatingEnergy.subscribe(val => {
      this.calculating = val;
    })


    this.accountFacilitiesSummarySub = this.facilityOverviewService.energyMeterSummaryData.subscribe(summaryData => {
      if (summaryData && summaryData.allMetersLastBill) {
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

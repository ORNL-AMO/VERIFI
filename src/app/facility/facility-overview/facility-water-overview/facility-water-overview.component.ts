import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityOverviewService } from '../facility-overview.service';

@Component({
  selector: 'app-facility-water-overview',
  templateUrl: './facility-water-overview.component.html',
  styleUrls: ['./facility-water-overview.component.css']
})
export class FacilityWaterOverviewComponent implements OnInit {

  lastMonthsDate: Date;
  yearPriorDate: Date;
  accountFacilitiesSummarySub: Subscription;
  calculatingSub: Subscription;
  calculating: boolean;
  facilityId: string;
  selectedFacilitySub: Subscription;
  constructor(private facilityOverviewService: FacilityOverviewService, private facilityDbService: FacilitydbService) { }


  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facilityId = val.guid;
    })
    this.calculatingSub = this.facilityOverviewService.calculatingWater.subscribe(val => {
      this.calculating = val;
    })

    this.accountFacilitiesSummarySub = this.facilityOverviewService.waterMeterSummaryData.subscribe(summaryData => {
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
    this.selectedFacilitySub.unsubscribe();
  }


}

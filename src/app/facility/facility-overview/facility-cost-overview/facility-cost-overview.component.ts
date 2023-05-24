import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { YearMonthData } from 'src/app/models/dashboard';
import { FacilityOverviewService } from '../facility-overview.service';

@Component({
  selector: 'app-facility-cost-overview',
  templateUrl: './facility-cost-overview.component.html',
  styleUrls: ['./facility-cost-overview.component.css']
})
export class FacilityCostOverviewComponent implements OnInit {

  calculatingSub: Subscription;
  calculating: boolean | 'error';
  displayWarning: boolean;
  facilityId: string;
  selectedFacilitySub: Subscription;

  dateRange: { startDate: Date, endDate: Date };
  dateRangeSub: Subscription;
  utilityUseAndCost: UtilityUseAndCost;
  utilityUseAndCostSub: Subscription;
  facilityOverviewData: FacilityOverviewData;
  facilityOverviewDataSub: Subscription;
  constructor(private facilityOverviewService: FacilityOverviewService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.facilityId = val.guid;
    })

    this.calculatingSub = this.facilityOverviewService.calculating.subscribe(val => {
      this.calculating = val;
    })

    this.dateRangeSub = this.facilityOverviewService.dateRange.subscribe(val => {
      this.dateRange = val;
    });

    this.utilityUseAndCostSub = this.facilityOverviewService.utilityUseAndCost.subscribe(val => {
      this.utilityUseAndCost = val;
    });

    this.facilityOverviewDataSub = this.facilityOverviewService.facilityOverviewData.subscribe(val => {
      this.facilityOverviewData = val;
      if (this.facilityOverviewData) {
        let test: YearMonthData = this.facilityOverviewData.allSourcesYearMonthData.find(data => {
          return data.energyCost != 0 && isNaN(data.energyCost) == false;
        });
        this.displayWarning = test == undefined;
      }
    })
  }

  ngOnDestroy() {
    this.calculatingSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.dateRangeSub.unsubscribe();
    this.utilityUseAndCostSub.unsubscribe();
    this.facilityOverviewDataSub.unsubscribe();
  }
}

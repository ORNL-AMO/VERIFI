import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityOverviewService } from '../facility-overview.service';

@Component({
  selector: 'app-facility-energy-overview',
  templateUrl: './facility-energy-overview.component.html',
  styleUrls: ['./facility-energy-overview.component.css']
})
export class FacilityEnergyOverviewComponent implements OnInit {


  calculatingSub: Subscription;
  calculating: boolean;
  facilityId: string;
  selectedFacilitySub: Subscription;
  energyUnit: string;

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
      this.energyUnit = val.energyUnit;
    });

    this.calculatingSub = this.facilityOverviewService.calculatingFacilityOverviewData.subscribe(val => {
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

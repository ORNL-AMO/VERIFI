import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { FacilityOverviewService } from '../facility-overview.service';

@Component({
    selector: 'app-facility-water-overview',
    templateUrl: './facility-water-overview.component.html',
    styleUrls: ['./facility-water-overview.component.css'],
    standalone: false
})
export class FacilityWaterOverviewComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  calculatingSub: Subscription;
  calculating: boolean | 'error';
  facilityId: string;
  selectedFacilitySub: Subscription;
  waterUnit: string;


  dateRange: { startDate: Date, endDate: Date };
  dateRangeSub: Subscription;
  utilityUseAndCost: UtilityUseAndCost;
  utilityUseAndCostSub: Subscription;
  facilityOverviewData: FacilityOverviewData;
  facilityOverviewDataSub: Subscription;
  constructor(private facilityOverviewService: FacilityOverviewService, private injector: Injector) { }


  ngOnInit(): void {
    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(val => {
      this.facilityId = val.guid;
      this.waterUnit = val.volumeLiquidUnit;
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

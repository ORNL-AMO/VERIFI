import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { FacilityOverviewService } from '../facility-overview.service';

@Component({
    selector: 'app-facility-energy-overview',
    templateUrl: './facility-energy-overview.component.html',
    styleUrls: ['./facility-energy-overview.component.css'],
    standalone: false
})
export class FacilityEnergyOverviewComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);


  calculatingSub: Subscription;
  calculating: boolean | 'error';
  facilityId: string;
  selectedFacilitySub: Subscription;
  energyUnit: string;

  dateRange: { startDate: Date, endDate: Date };
  dateRangeSub: Subscription;
  utilityUseAndCost: UtilityUseAndCost;
  utilityUseAndCostSub: Subscription;
  facilityOverviewData: FacilityOverviewData;
  facilityOverviewDataSub: Subscription;
  energyIsSource: boolean;
  constructor(private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility).subscribe(val => {
      this.facilityId = val.guid;
      this.energyUnit = val.energyUnit;
      this.energyIsSource = val.energyIsSource;
    });

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

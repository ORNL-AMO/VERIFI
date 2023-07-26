import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';

@Injectable({
  providedIn: 'root'
})
export class FacilityOverviewService {

  emissionsDisplay: BehaviorSubject<"market" | "location">;

  dateRange: BehaviorSubject<{
    startDate: Date,
    endDate: Date
  }>;
  
  facilityOverviewData: BehaviorSubject<FacilityOverviewData>;
  utilityUseAndCost: BehaviorSubject<UtilityUseAndCost>;
  calculating: BehaviorSubject<boolean | 'error'>;

  constructor() {
    this.emissionsDisplay = new BehaviorSubject<"market" | "location">("market");
    this.dateRange = new BehaviorSubject(undefined);
    this.utilityUseAndCost = new BehaviorSubject(undefined);
    this.facilityOverviewData = new BehaviorSubject(undefined);
    this.calculating = new BehaviorSubject(undefined);
  }

}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';

@Injectable({
  providedIn: 'root'
})
export class AccountOverviewService {

  // calanderizedMeters: Array<CalanderizedMeter>;
  emissionsDisplay: BehaviorSubject<"market" | "location">;

  dateRange: BehaviorSubject<{
    startDate: Date,
    endDate: Date
  }>;

  accountOverviewData: BehaviorSubject<AccountOverviewData>;
  utilityUseAndCost: BehaviorSubject<UtilityUseAndCost>;
  calculating: BehaviorSubject<boolean | 'error'>;
  constructor() {
    this.emissionsDisplay = new BehaviorSubject<"market" | "location">("market");

    this.dateRange = new BehaviorSubject<{
      startDate: Date,
      endDate: Date
    }>(undefined);

    this.accountOverviewData = new BehaviorSubject<AccountOverviewData>(undefined);
    this.utilityUseAndCost = new BehaviorSubject<UtilityUseAndCost>(undefined);
    this.calculating = new BehaviorSubject<boolean>(undefined)
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Injectable({
  providedIn: 'root'
})
export class AccountOverviewService {

  calanderizedMeters: Array<CalanderizedMeter>;
  emissionsDisplay: BehaviorSubject<"market" | "location">;

  dateRange: BehaviorSubject<{
    startDate: Date,
    endDate: Date
  }>;

  accountOverviewData: BehaviorSubject<AccountOverviewData>;
  utilityUseAndCost: BehaviorSubject<UtilityUseAndCost>;
  calculatingAccountOverviewData: BehaviorSubject<boolean>;
  constructor(private calanderizationService: CalanderizationService, private utilityMeterDbService: UtilityMeterdbService) {
    this.emissionsDisplay = new BehaviorSubject<"market" | "location">("market");

    this.dateRange = new BehaviorSubject<{
      startDate: Date,
      endDate: Date
    }>(undefined);

    this.accountOverviewData = new BehaviorSubject<AccountOverviewData>(undefined);
    this.utilityUseAndCost = new BehaviorSubject<UtilityUseAndCost>(undefined);
    this.calculatingAccountOverviewData = new BehaviorSubject<boolean>(undefined)
  }

  setCalanderizedMeters() {
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (meters.length > 0) {
      this.calanderizedMeters = this.calanderizationService.getCalanderizedMeterData(meters, true, true);
    } else {
      this.calanderizedMeters = [];
    }
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AccountFacilitiesSummary, UtilityUsageSummaryData } from 'src/app/models/dashboard';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Injectable({
  providedIn: 'root'
})
export class AccountOverviewService {

  accountFacilitiesSummary: BehaviorSubject<AccountFacilitiesSummary>;
  utilityUsageSummaryData: BehaviorSubject<UtilityUsageSummaryData>;
  calculating: BehaviorSubject<boolean>;
  calanderizedMeters: Array<CalanderizedMeter>;
  constructor(private calanderizationService: CalanderizationService, private utilityMeterDbService: UtilityMeterdbService) {
    this.calculating = new BehaviorSubject<boolean>(undefined);
    this.accountFacilitiesSummary = new BehaviorSubject<AccountFacilitiesSummary>({
      facilitySummaries: [],
      totalEnergyUse: undefined,
      totalEnergyCost: undefined,
      totalNumberOfMeters: undefined,
      totalLocationEmissions: undefined,
      totalMarketEmissions: undefined,
      allMetersLastBill: undefined
    });
    this.utilityUsageSummaryData = new BehaviorSubject<UtilityUsageSummaryData>(undefined);
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

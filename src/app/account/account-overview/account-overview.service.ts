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

  accountFacilitiesEnergySummary: BehaviorSubject<AccountFacilitiesSummary>;
  energyUtilityUsageSummaryData: BehaviorSubject<UtilityUsageSummaryData>;
  calculatingEnergy: BehaviorSubject<boolean>;
  calanderizedMeters: Array<CalanderizedMeter>;

  accountFacilitiesCostsSummary: BehaviorSubject<AccountFacilitiesSummary>;
  costsUtilityUsageSummaryData: BehaviorSubject<UtilityUsageSummaryData>;
  calculatingCosts: BehaviorSubject<boolean>;

  accountFacilitiesWaterSummary: BehaviorSubject<AccountFacilitiesSummary>;
  waterUtilityUsageSummaryData: BehaviorSubject<UtilityUsageSummaryData>;
  calculatingWater: BehaviorSubject<boolean>;


  emissionsDisplay: BehaviorSubject<"market" | "location">;
  constructor(private calanderizationService: CalanderizationService, private utilityMeterDbService: UtilityMeterdbService) {
    this.calculatingEnergy = new BehaviorSubject<boolean>(undefined);
    this.accountFacilitiesEnergySummary = new BehaviorSubject<AccountFacilitiesSummary>({
      facilitySummaries: [],
      totalEnergyUse: undefined,
      totalEnergyCost: undefined,
      totalNumberOfMeters: undefined,
      totalLocationEmissions: undefined,
      totalMarketEmissions: undefined,
      allMetersLastBill: undefined,
      totalConsumption: undefined
    });
    this.energyUtilityUsageSummaryData = new BehaviorSubject<UtilityUsageSummaryData>(undefined);


    this.calculatingCosts = new BehaviorSubject<boolean>(undefined);
    this.accountFacilitiesCostsSummary = new BehaviorSubject<AccountFacilitiesSummary>({
      facilitySummaries: [],
      totalEnergyUse: undefined,
      totalEnergyCost: undefined,
      totalNumberOfMeters: undefined,
      totalLocationEmissions: undefined,
      totalMarketEmissions: undefined,
      allMetersLastBill: undefined,
      totalConsumption: undefined
    });
    this.costsUtilityUsageSummaryData = new BehaviorSubject<UtilityUsageSummaryData>(undefined);

    

    this.calculatingWater = new BehaviorSubject<boolean>(undefined);
    this.accountFacilitiesWaterSummary = new BehaviorSubject<AccountFacilitiesSummary>({
      facilitySummaries: [],
      totalEnergyUse: undefined,
      totalEnergyCost: undefined,
      totalNumberOfMeters: undefined,
      totalLocationEmissions: undefined,
      totalMarketEmissions: undefined,
      allMetersLastBill: undefined,
      totalConsumption: undefined
    });
    this.waterUtilityUsageSummaryData = new BehaviorSubject<UtilityUsageSummaryData>(undefined);

    this.emissionsDisplay = new BehaviorSubject<"market" | "location">("market");
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

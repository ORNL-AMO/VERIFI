import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Injectable({
  providedIn: 'root'
})
export class FacilityOverviewService {

  calanderizedMeters: Array<CalanderizedMeter>;
  emissionsDisplay: BehaviorSubject<"market" | "location">;

  calculatingEnergy: BehaviorSubject<boolean>;
  energyMeterSummaryData: BehaviorSubject<FacilityMeterSummaryData>;
  calculatingCosts: BehaviorSubject<boolean>;
  costsMeterSummaryData: BehaviorSubject<FacilityMeterSummaryData>;
  calculatingWater: BehaviorSubject<boolean>;
  waterMeterSummaryData: BehaviorSubject<FacilityMeterSummaryData>;
  constructor(private utilityMeterDbService: UtilityMeterdbService, private calanderizationService: CalanderizationService) { 
    this.emissionsDisplay = new BehaviorSubject<"market" | "location">("market");
    this.calculatingEnergy = new BehaviorSubject<boolean>(undefined);
    this.calculatingCosts = new BehaviorSubject<boolean>(undefined);
    this.calculatingWater = new BehaviorSubject<boolean>(undefined);
    this.energyMeterSummaryData = new BehaviorSubject<FacilityMeterSummaryData>(undefined);
    this.costsMeterSummaryData = new BehaviorSubject<FacilityMeterSummaryData>(undefined);
    this.waterMeterSummaryData = new BehaviorSubject<FacilityMeterSummaryData>(undefined);
  
  
  
  }

  setCalanderizedMeters() {
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    if (meters.length > 0) {
      this.calanderizedMeters = this.calanderizationService.getCalanderizedMeterData(meters, false, true);
    } else {
      this.calanderizedMeters = [];
    }
  }
}

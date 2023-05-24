import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FacilityOverviewData } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Injectable({
  providedIn: 'root'
})
export class FacilityOverviewService {

  calanderizedMeters: Array<CalanderizedMeter>;
  emissionsDisplay: BehaviorSubject<"market" | "location">;

  dateRange: BehaviorSubject<{
    startDate: Date,
    endDate: Date
  }>;
  
  facilityOverviewData: BehaviorSubject<FacilityOverviewData>;
  utilityUseAndCost: BehaviorSubject<UtilityUseAndCost>;
  calculating: BehaviorSubject<boolean | 'error'>;

  constructor(private utilityMeterDbService: UtilityMeterdbService, private calanderizationService: CalanderizationService) {
    this.emissionsDisplay = new BehaviorSubject<"market" | "location">("market");
    this.dateRange = new BehaviorSubject(undefined);
    this.utilityUseAndCost = new BehaviorSubject(undefined);
    this.facilityOverviewData = new BehaviorSubject(undefined);
    this.calculating = new BehaviorSubject(undefined);
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

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { FacilityMeterSummaryData, UtilityUsageSummaryData, YearMonthData } from 'src/app/models/dashboard';
import { IdbUtilityMeter, MeterSource } from 'src/app/models/idb';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Injectable({
  providedIn: 'root'
})
export class FacilityOverviewService {

  calanderizedMeters: Array<CalanderizedMeter>;
  emissionsDisplay: BehaviorSubject<"market" | "location">;

  calculatingEnergy: BehaviorSubject<boolean>;
  energyMeterSummaryData: BehaviorSubject<FacilityMeterSummaryData>;
  energyMonthlySourceData: BehaviorSubject<Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>>;
  energyUtilityUsageSummaryData: BehaviorSubject<UtilityUsageSummaryData>;
  energyYearMonthData: BehaviorSubject<Array<YearMonthData>>;


  calculatingCosts: BehaviorSubject<boolean>;
  costsMeterSummaryData: BehaviorSubject<FacilityMeterSummaryData>;
  costsMonthlySourceData: BehaviorSubject<Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>>;
  costsUtilityUsageSummaryData: BehaviorSubject<UtilityUsageSummaryData>;
  costsYearMonthData: BehaviorSubject<Array<YearMonthData>>;

  calculatingWater: BehaviorSubject<boolean>;
  waterMeterSummaryData: BehaviorSubject<FacilityMeterSummaryData>;
  waterMonthlySourceData: BehaviorSubject<Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>>;
  waterUtilityUsageSummaryData: BehaviorSubject<UtilityUsageSummaryData>;
  waterYearMonthData: BehaviorSubject<Array<YearMonthData>>;
  constructor(private utilityMeterDbService: UtilityMeterdbService, private calanderizationService: CalanderizationService) {
    this.emissionsDisplay = new BehaviorSubject<"market" | "location">("market");
    this.calculatingEnergy = new BehaviorSubject<boolean>(undefined);
    this.calculatingCosts = new BehaviorSubject<boolean>(undefined);
    this.calculatingWater = new BehaviorSubject<boolean>(undefined);
    this.energyMeterSummaryData = new BehaviorSubject<FacilityMeterSummaryData>(undefined);
    this.energyMonthlySourceData = new BehaviorSubject(undefined);
    this.energyUtilityUsageSummaryData = new BehaviorSubject(undefined);
    this.energyYearMonthData = new BehaviorSubject(undefined);
    this.costsMeterSummaryData = new BehaviorSubject<FacilityMeterSummaryData>(undefined);
    this.costsMonthlySourceData = new BehaviorSubject(undefined);
    this.costsUtilityUsageSummaryData = new BehaviorSubject(undefined);
    this.costsYearMonthData = new BehaviorSubject(undefined);
    this.waterMeterSummaryData = new BehaviorSubject<FacilityMeterSummaryData>(undefined);
    this.waterMonthlySourceData = new BehaviorSubject(undefined);
    this.waterUtilityUsageSummaryData = new BehaviorSubject(undefined);
    this.waterYearMonthData = new BehaviorSubject(undefined);
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

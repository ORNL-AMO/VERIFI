import { Injectable } from '@angular/core';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from '../models/idb';
import { VisualizationService } from '../utility/visualization/visualization.service';
import * as _ from 'lodash';
@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  constructor(private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService, private visualizationService: VisualizationService) { }

  getAccountFacilitesSummary(): Array<FacilitySummary> {
    let facilitiesSummary: Array<FacilitySummary> = new Array();
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    facilities.forEach(facility => {
      let facilityMeterSummary: FacilitySummary = this.getFacilitySummary(facility);
      facilitiesSummary.push(facilityMeterSummary);
    });
    return facilitiesSummary;
  }

  getFacilitySummary(facility: IdbFacility): FacilitySummary {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMetersCopy: Array<IdbUtilityMeter> = JSON.parse(JSON.stringify(accountMeters));
    let facilityMeters: Array<IdbUtilityMeter> = accountMetersCopy.filter(meter => { return meter.facilityId == facility.id });
    let facilityMetersDataSummary: Array<{ time: string, energyUse: number, energyCost: number }> = this.visualizationService.getFacilityBarChartData(facilityMeters, false, true);
    return {
      facility: facility,
      energyUsage: _.sumBy(facilityMetersDataSummary, 'energyUse'),
      energyCost: _.sumBy(facilityMetersDataSummary, 'energyCost'),
      numberOfMeters: facilityMeters.length
    }
  }
}

export interface FacilitySummary {
  facility: IdbFacility,
  energyUsage: number,
  energyCost: number,
  numberOfMeters: number
}
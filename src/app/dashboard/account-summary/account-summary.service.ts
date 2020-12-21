import { Injectable } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizationService, CalanderizedMeter } from 'src/app/utility/calanderization/calanderization.service';
import * as _ from 'lodash';
import { VisualizationService } from 'src/app/utility/visualization/visualization.service';

@Injectable({
  providedIn: 'root'
})
export class AccountSummaryService {

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

import { Injectable } from '@angular/core';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { LastYearData, MonthlyData } from 'src/app/models/calanderization';
import { FacilityMeterSummaryData, MeterSummary } from 'src/app/models/dashboard';
import { IdbUtilityMeter, IdbUtilityMeterGroup } from 'src/app/models/idb';
import { CalanderizationService } from './calanderization.service';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class MeterSummaryService {

  constructor(private calanderizationService: CalanderizationService, private utilityMeterGroupDbService: UtilityMeterGroupdbService) { }

  getFacilityMetersSummary(inAccount: boolean, facilityMeters: Array<IdbUtilityMeter>): FacilityMeterSummaryData {
    let facilityMetersSummary: Array<MeterSummary> = new Array();
    let allMetersLastBill: MonthlyData = this.calanderizationService.getLastBillEntry(facilityMeters, inAccount)
    facilityMeters.forEach(meter => {
      let summary: MeterSummary = this.getMeterSummary(meter, inAccount, allMetersLastBill);
      facilityMetersSummary.push(summary);
    });
    return {
      meterSummaries: facilityMetersSummary,
      totalEnergyUse: _.sumBy(facilityMetersSummary, 'energyUsage'),
      totalEnergyCost: _.sumBy(facilityMetersSummary, 'energyCost'),
      totalEmissions: _.sumBy(facilityMetersSummary, 'emissions'),
      allMetersLastBill: allMetersLastBill
    };
  }

  getMeterSummary(meter: IdbUtilityMeter, inAccount: boolean, allMetersLastBill: MonthlyData): MeterSummary {
    let lastBill: MonthlyData = this.calanderizationService.getLastBillEntry([meter], inAccount);
    let lastYearData: Array<LastYearData> = this.calanderizationService.getPastYearData([meter], inAccount, allMetersLastBill);
    let group: IdbUtilityMeterGroup = this.utilityMeterGroupDbService.getGroupById(meter.groupId);
    let groupName: string = 'Ungrouped';
    if (group) {
      groupName = group.name;
    }
    let lastBillDate: Date;
    if (lastBill) {
      lastBillDate = new Date(lastBill.year, lastBill.monthNumValue + 1);
    }
    return {
      meter: meter,
      energyUsage: _.sumBy(lastYearData, 'energyUse'),
      energyCost: _.sumBy(lastYearData, 'energyCost'),
      emissions: _.sumBy(lastYearData, 'emissions'),
      lastBill: lastBill,
      groupName: groupName,
      lastBillDate: lastBillDate
    }
  }
}

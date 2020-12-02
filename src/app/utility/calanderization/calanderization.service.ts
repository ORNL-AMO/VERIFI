import { Injectable } from '@angular/core';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';

@Injectable({
  providedIn: 'root'
})
export class CalanderizationService {

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService) {
  }

  calanderizeFacilityMeters(facilityMeters: Array<IdbUtilityMeter>) {
    let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let calanderizedMeterData: Array<CalanderizedMeter> = new Array();
    facilityMeters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData> = facilityMeterData.filter(meterData => { return meterData.meterId == meter.id });
      let calanderizedMeter: Array<MonthlyData> = this.calanderizeMeterData(meterData);
      calanderizedMeterData.push({
        meter: meter,
        monthlyData: calanderizedMeter
      });
    });
    return calanderizedMeterData;
  }


  calanderizeMeterData(meterData: Array<IdbUtilityMeterData>): Array<MonthlyData> {
    let calanderizeData: Array<MonthlyData> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    for (let meterIndex = 1; meterIndex < orderedMeterData.length - 1; meterIndex++) {
      let currentBill: IdbUtilityMeterData = orderedMeterData[meterIndex];
      let previousBill: IdbUtilityMeterData = orderedMeterData[meterIndex - 1];
      let daysFromPrevious: number = this.daysBetweenDates(new Date(previousBill.readDate), new Date(currentBill.readDate));

      let nextBill: IdbUtilityMeterData = orderedMeterData[meterIndex + 1];
      let daysFromNext: number = this.daysBetweenDates(new Date(currentBill.readDate), new Date(nextBill.readDate));
      let totalMonthCost: number;
      let totalMonthEnergyUse: number;
      if (daysFromPrevious > 20 && daysFromPrevious < 40) {
        let firstDayOfCurrentMonth: Date = new Date(currentBill.readDate);
        firstDayOfCurrentMonth.setDate(1);
        let daysBeforeCurrentBill: number = this.daysBetweenDates(firstDayOfCurrentMonth, new Date(currentBill.readDate)) + 1;

        let costPerDayCurrentBill: number = currentBill.totalCost / daysFromPrevious;
        let energyUsePerDayCurrentBill: number = currentBill.totalEnergyUse / daysFromPrevious;

        let firstDayOfNextMonth: Date = new Date(nextBill.readDate);
        firstDayOfNextMonth.setDate(1);
        let daysAfterCurrentBill: number = this.daysBetweenDates(new Date(currentBill.readDate), firstDayOfNextMonth) + 1;
        let costPerDayNextBill: number = nextBill.totalCost / daysFromNext;
        let energyUsePerDayNextBill: number = nextBill.totalEnergyUse / daysFromNext;

        totalMonthCost = (costPerDayCurrentBill * daysBeforeCurrentBill) + (costPerDayNextBill * daysAfterCurrentBill);
        totalMonthEnergyUse = (energyUsePerDayCurrentBill * daysBeforeCurrentBill) + (energyUsePerDayNextBill * daysAfterCurrentBill);
      }
      calanderizeData.push({
        month: new Date(currentBill.readDate).toLocaleString('default', { month: 'long' }),
        year: new Date(currentBill.readDate).getFullYear(),
        energyUse: totalMonthEnergyUse,
        energyCost: totalMonthCost,
      });
    }
    return calanderizeData;
  }

  daysBetweenDates(firstDate: Date, secondDate: Date) {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
    const utc2 = Date.UTC(secondDate.getFullYear(), secondDate.getMonth(), secondDate.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
  }
}

export interface CalanderizedMeter {
  meter: IdbUtilityMeter,
  monthlyData: Array<MonthlyData>
}

export interface MonthlyData {
  month: string,
  year: number,
  energyUse: number,
  energyCost: number,
}
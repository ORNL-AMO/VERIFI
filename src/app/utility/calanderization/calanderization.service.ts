import { Injectable } from '@angular/core';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';

@Injectable({
  providedIn: 'root'
})
export class CalanderizationService {

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private energyUnitsHelperService: EnergyUnitsHelperService) {
  }

  calanderizeMetersInAccount(facilityMeters: Array<IdbUtilityMeter>, monthDisplayShort?: boolean) {
    let calanderizedMeterData: Array<CalanderizedMeter> = new Array();
    facilityMeters.forEach(meter => {
      let consumptionUnit: string = this.energyUnitsHelperService.getAccountUnitFromMeter(meter);
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForAccount(meter);
      let calanderizedMeter: Array<MonthlyData> = this.calanderizeMeterData(meter.source, meterData, monthDisplayShort);
      calanderizedMeterData.push({
        consumptionUnit: consumptionUnit,
        meter: meter,
        monthlyData: calanderizedMeter
      });
    });
    return calanderizedMeterData;
  }

  calanderizeMetersInFacility(facilityMeters: Array<IdbUtilityMeter>, monthDisplayShort?: boolean) {
    let calanderizedMeterData: Array<CalanderizedMeter> = new Array();
    facilityMeters.forEach(meter => {
      let consumptionUnit: string = this.energyUnitsHelperService.getFacilityUnitFromMeter(meter);
      let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getMeterDataForFacility(meter);
      let calanderizedMeter: Array<MonthlyData> = this.calanderizeMeterData(meter.source, meterData, monthDisplayShort);
      calanderizedMeterData.push({
        consumptionUnit: consumptionUnit,
        meter: meter,
        monthlyData: calanderizedMeter
      });
    });
    return calanderizedMeterData;
  }

  calanderizeMeterData(source: string, meterData: Array<IdbUtilityMeterData>, monthDisplayShort?: boolean): Array<MonthlyData> {
    let calanderizeData: Array<MonthlyData> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    for (let meterIndex = 1; meterIndex < orderedMeterData.length - 1; meterIndex++) {
      let currentBill: IdbUtilityMeterData = orderedMeterData[meterIndex];
      let previousBill: IdbUtilityMeterData = orderedMeterData[meterIndex - 1];
      let daysFromPrevious: number = this.daysBetweenDates(new Date(previousBill.readDate), new Date(currentBill.readDate));

      let nextBill: IdbUtilityMeterData = orderedMeterData[meterIndex + 1];
      let daysFromNext: number = this.daysBetweenDates(new Date(currentBill.readDate), new Date(nextBill.readDate));
      let totalMonthCost: number;
      let totalMonthEnergyConsumption: number;
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
        let energyConsumptionPerDayNextBill: number = nextBill.totalEnergyUse / daysFromNext;
        let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(source);
        if (isEnergyMeter) {
          energyConsumptionPerDayNextBill = nextBill.totalEnergyUse / daysFromNext;
        } else {
          energyConsumptionPerDayNextBill = nextBill.totalVolume / daysFromNext;
        }
        totalMonthCost = (costPerDayCurrentBill * daysBeforeCurrentBill) + (costPerDayNextBill * daysAfterCurrentBill);
        totalMonthEnergyConsumption = (energyUsePerDayCurrentBill * daysBeforeCurrentBill) + (energyConsumptionPerDayNextBill * daysAfterCurrentBill);
      }
      let month: string;
      if (monthDisplayShort) {
        month = new Date(currentBill.readDate).toLocaleString('default', { month: 'short' });
      } else {
        month = new Date(currentBill.readDate).toLocaleString('default', { month: 'long' });
      }

      calanderizeData.push({
        month: month,
        monthNumValue: new Date(currentBill.readDate).getMonth(),
        year: new Date(currentBill.readDate).getFullYear(),
        energyConsumption: totalMonthEnergyConsumption,
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
  consumptionUnit: string,
  monthlyData: Array<MonthlyData>
}

export interface MonthlyData {
  month: string,
  monthNumValue: number,
  year: number,
  energyConsumption: number,
  energyCost: number,
}
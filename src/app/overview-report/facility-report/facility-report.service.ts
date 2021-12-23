import { Injectable } from '@angular/core';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbFacility, IdbUtilityMeter, MeterSource } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ReportOptions, ReportUtilityOptions } from '../overview-report.service';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class FacilityReportService {

  constructor(private calanderizationService: CalanderizationService) { }


  getUtilityUsageData(facilityMeters: Array<IdbUtilityMeter>, reportUtilityOptions: ReportUtilityOptions): FacilityReportUtilitySummary {
    let utilitySummaries: Array<UtilitySummary> = new Array();
    let lastBillEntry: MonthlyData = this.calanderizationService.getLastBillEntry(facilityMeters, false);
    let pastYearEnd: Date = new Date(lastBillEntry.date);
    let pastYearStart: Date = new Date(pastYearEnd.getUTCFullYear() - 1, pastYearEnd.getUTCMonth() + 1);
    let yearPriorEnd: Date = new Date(pastYearStart.getUTCFullYear(), pastYearStart.getUTCMonth() - 1);
    let yearPriorStart: Date = new Date(yearPriorEnd.getUTCFullYear() - 1, yearPriorEnd.getUTCMonth() + 1);
    if (reportUtilityOptions.electricity) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(facilityMeters, pastYearStart, pastYearEnd, yearPriorStart, yearPriorEnd, 'Electricity');
      utilitySummaries.push(utilitySummary)
    }
    if (reportUtilityOptions.naturalGas) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(facilityMeters, pastYearStart, pastYearEnd, yearPriorStart, yearPriorEnd, 'Natural Gas');
      utilitySummaries.push(utilitySummary)
    }
    if (reportUtilityOptions.otherFuels) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(facilityMeters, pastYearStart, pastYearEnd, yearPriorStart, yearPriorEnd, 'Other Fuels');
      utilitySummaries.push(utilitySummary)
    }
    if (reportUtilityOptions.otherEnergy) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(facilityMeters, pastYearStart, pastYearEnd, yearPriorStart, yearPriorEnd, 'Other Energy');
      utilitySummaries.push(utilitySummary)
    }
    if (reportUtilityOptions.water) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(facilityMeters, pastYearStart, pastYearEnd, yearPriorStart, yearPriorEnd, 'Water');
      utilitySummaries.push(utilitySummary)
    }
    if (reportUtilityOptions.wasteWater) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(facilityMeters, pastYearStart, pastYearEnd, yearPriorStart, yearPriorEnd, 'Waste Water');
      utilitySummaries.push(utilitySummary)
    }
    if (reportUtilityOptions.otherUtility) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(facilityMeters, pastYearStart, pastYearEnd, yearPriorStart, yearPriorEnd, 'Other Utility');
      utilitySummaries.push(utilitySummary)
    }
    let consumptionPastYear: number = _.sumBy(utilitySummaries, 'consumptionPastYear');
    let costPastYear: number = _.sumBy(utilitySummaries, 'costPastYear');
    let emissionsPastYear: number = _.sumBy(utilitySummaries, 'emissionsPastYear');
    let consumptionYearPrior: number = _.sumBy(utilitySummaries, 'consumptionYearPrior');
    let costYearPrior: number = _.sumBy(utilitySummaries, 'costYearPrior');
    let emissionsYearPrior: number = _.sumBy(utilitySummaries, 'emissionsYearPrior');
    return {
      utilitySummaries: utilitySummaries,
      totals: {
        source: undefined,
        consumptionPastYear: consumptionPastYear,
        costPastYear: costPastYear,
        emissionsPastYear: emissionsPastYear,
        consumptionYearPrior: consumptionYearPrior,
        costYearPrior: costYearPrior,
        emissionsYearPrior: emissionsYearPrior,
        consumptionChange: consumptionPastYear - consumptionYearPrior,
        costChange: costPastYear - costYearPrior,
        emissionsChange: emissionsPastYear - emissionsYearPrior
      },
      pastYearStart: pastYearStart,
      pastYearEnd: pastYearEnd,
      yearPriorStart: yearPriorStart,
      yearPriorEnd: yearPriorEnd
    }
  }

  getUtilitySummary(meters: Array<IdbUtilityMeter>, pastYearStart: Date, pastYearEnd: Date, yearPriorStart: Date, yearPriorEnd: Date, source: MeterSource): UtilitySummary {
    let sourceMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return meter.source == source });
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(sourceMeters, false);
    let monthlyData: Array<MonthlyData> = calanderizedMeterData.flatMap(data => { return data.monthlyData });
    let pastYearData: Array<MonthlyData> = monthlyData.filter(data => {
      let dataDate: Date = new Date(data.date);
      return this.isDateWithinRange(dataDate, pastYearStart, pastYearEnd);
    });
    let yearPriorData: Array<MonthlyData> = monthlyData.filter(data => {
      let dataDate: Date = new Date(data.date);
      return this.isDateWithinRange(dataDate, yearPriorStart, yearPriorEnd);
    });
    //divide emissions by /1000 for tonne
    let consumptionPastYear: number = _.sumBy(pastYearData, 'energyUse');
    let costPastYear: number = _.sumBy(pastYearData, 'energyCost');
    let emissionsPastYear: number = _.sumBy(pastYearData, 'emissions') / 1000;
    let consumptionYearPrior: number = _.sumBy(yearPriorData, 'energyUse');
    let costYearPrior: number = _.sumBy(yearPriorData, 'energyCost');
    let emissionsYearPrior: number = _.sumBy(yearPriorData, 'emissions') / 1000;
    return {
      source: source,
      consumptionPastYear: consumptionPastYear,
      costPastYear: costPastYear,
      emissionsPastYear: emissionsPastYear,
      consumptionYearPrior: consumptionYearPrior,
      costYearPrior: costYearPrior,
      emissionsYearPrior: emissionsYearPrior,
      consumptionChange: consumptionPastYear - consumptionYearPrior,
      costChange: costPastYear - costYearPrior,
      emissionsChange: emissionsPastYear - emissionsYearPrior
    }
  }

  isDateWithinRange(dataDate: Date, startDate: Date, endDate: Date): boolean {
    if (dataDate >= startDate && dataDate <= endDate) {
      return true;
    } else {
      return false;
    }
  }

}


export interface FacilityReportUtilitySummary {
  utilitySummaries: Array<UtilitySummary>,
  totals: UtilitySummary,
  pastYearStart: Date,
  pastYearEnd: Date,
  yearPriorStart: Date,
  yearPriorEnd: Date
}

export interface UtilitySummary {
  source: MeterSource,
  consumptionPastYear: number,
  costPastYear: number,
  emissionsPastYear: number,
  consumptionYearPrior: number,
  costYearPrior: number,
  emissionsYearPrior: number,
  consumptionChange: number,
  costChange: number,
  emissionsChange: number
}


import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { CalanderizedMeter, MonthlyData } from '../models/calanderization';
import { IdbFacility, IdbUtilityMeter, MeterSource } from '../models/idb';
import { CalanderizationService } from '../shared/helper-services/calanderization.service';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class OverviewReportService {

  showReportMenu: BehaviorSubject<boolean>;
  reportOptions: BehaviorSubject<ReportOptions>;
  reportUtilityOptions: BehaviorSubject<ReportUtilityOptions>;
  constructor(private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService, private calanderizationService: CalanderizationService) {
    this.showReportMenu = new BehaviorSubject<boolean>(false);
    this.reportOptions = new BehaviorSubject<ReportOptions>(undefined);
    this.reportUtilityOptions = new BehaviorSubject<ReportUtilityOptions>(undefined);
  }

  initializeOptions() {
    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    accountFacilites.forEach(facility => {
      facility.selected = true;
    });
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let electricity: boolean = false;
    let naturalGas: boolean = false;
    let otherFuels: boolean = false;
    let otherEnergy: boolean = false;
    let water: boolean = false;
    let wasteWater: boolean = false;
    let otherUtility: boolean = false;
    accountMeters.forEach(meter => {
      if (meter.source == 'Electricity') {
        electricity = true;
      } else if (meter.source == 'Natural Gas') {
        naturalGas = true;
      } else if (meter.source == 'Other Energy') {
        otherEnergy = true;
      } else if (meter.source == 'Other Fuels') {
        otherFuels = true;
      } else if (meter.source == 'Other Utility') {
        otherUtility = true;
      } else if (meter.source == 'Waste Water') {
        wasteWater = true;
      } else if (meter.source == 'Water') {
        water = true;
      }
    })

    this.reportOptions.next({
      title: 'Energy Consumption Report',
      notes: '',
      includeAccount: true,
      accountInfo: true,
      facilitySummaryTable: true,
      accountUtilityTable: true,
      accountFacilityCharts: true,
      accountFacilityAnnualBarChart: true,
      includeFacilities: true,
      facilities: accountFacilites,
      facilityMetersTable: true,
      facilityUtilityUsageTable: true,
      facilityInfo: true,
      facilityBarCharts: true
    });
    this.reportUtilityOptions.next({
      electricity: electricity,
      naturalGas: naturalGas,
      otherFuels: otherFuels,
      otherEnergy: otherEnergy,
      water: water,
      wasteWater: wasteWater,
      otherUtility: otherUtility
    })
  }


  getUtilityUsageData(meters: Array<IdbUtilityMeter>, reportUtilityOptions: ReportUtilityOptions, inAccount: boolean): ReportUtilitySummary {
    let utilitySummaries: Array<UtilitySummary> = new Array();
    let lastBillEntry: MonthlyData = this.calanderizationService.getLastBillEntry(meters, inAccount);
    let pastYearEnd: Date = new Date(lastBillEntry.date);
    let pastYearStart: Date = new Date(pastYearEnd.getUTCFullYear() - 1, pastYearEnd.getUTCMonth() + 1);
    let yearPriorEnd: Date = new Date(pastYearStart.getUTCFullYear(), pastYearStart.getUTCMonth() - 1);
    let yearPriorStart: Date = new Date(yearPriorEnd.getUTCFullYear() - 1, yearPriorEnd.getUTCMonth() + 1);
    if (reportUtilityOptions.electricity) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(meters, pastYearStart, pastYearEnd, yearPriorStart, yearPriorEnd, 'Electricity', inAccount);
      utilitySummaries.push(utilitySummary)
    }
    if (reportUtilityOptions.naturalGas) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(meters, pastYearStart, pastYearEnd, yearPriorStart, yearPriorEnd, 'Natural Gas', inAccount);
      utilitySummaries.push(utilitySummary)
    }
    if (reportUtilityOptions.otherFuels) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(meters, pastYearStart, pastYearEnd, yearPriorStart, yearPriorEnd, 'Other Fuels', inAccount);
      utilitySummaries.push(utilitySummary)
    }
    if (reportUtilityOptions.otherEnergy) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(meters, pastYearStart, pastYearEnd, yearPriorStart, yearPriorEnd, 'Other Energy', inAccount);
      utilitySummaries.push(utilitySummary)
    }
    if (reportUtilityOptions.water) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(meters, pastYearStart, pastYearEnd, yearPriorStart, yearPriorEnd, 'Water', inAccount);
      utilitySummaries.push(utilitySummary)
    }
    if (reportUtilityOptions.wasteWater) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(meters, pastYearStart, pastYearEnd, yearPriorStart, yearPriorEnd, 'Waste Water', inAccount);
      utilitySummaries.push(utilitySummary)
    }
    if (reportUtilityOptions.otherUtility) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(meters, pastYearStart, pastYearEnd, yearPriorStart, yearPriorEnd, 'Other Utility', inAccount);
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

  getUtilitySummary(meters: Array<IdbUtilityMeter>, pastYearStart: Date, pastYearEnd: Date, yearPriorStart: Date, yearPriorEnd: Date, source: MeterSource, inAccount: boolean): UtilitySummary {
    let sourceMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return meter.source == source });
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(sourceMeters, inAccount);
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


export interface ReportUtilitySummary {
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


export interface ReportOptions {
  title: string,
  notes: string,
  includeAccount: boolean,
  accountInfo: boolean,
  facilitySummaryTable: boolean,
  accountUtilityTable: boolean,
  accountFacilityCharts: boolean,
  accountFacilityAnnualBarChart: boolean,
  includeFacilities: boolean,
  facilities: Array<IdbFacility>,
  facilityMetersTable: boolean,
  facilityUtilityUsageTable: boolean,
  facilityInfo: boolean,
  facilityBarCharts: boolean
}

export interface ReportUtilityOptions {
  electricity: boolean,
  naturalGas: boolean,
  otherFuels: boolean,
  otherEnergy: boolean,
  water: boolean,
  wasteWater: boolean,
  otherUtility: boolean,
}
import { Injectable } from '@angular/core';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup } from '../models/idb';
import * as _ from 'lodash';
import { CalanderizationService } from '../shared/helper-services/calanderization.service';
import { UtilityMeterGroupdbService } from '../indexedDB/utilityMeterGroup-db.service';
import { AccountFacilitiesSummary, FacilityMeterSummaryData, FacilitySummary, MeterSummary, SummaryData, UtilityUsageSummaryData } from '../models/dashboard';
import { CalanderizedMeter, LastYearData, MonthlyData } from '../models/calanderization';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {



  graphDisplay: BehaviorSubject<"usage" | "cost">;
  bannerDropdownOpen: BehaviorSubject<boolean>;
  constructor(private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService,
    private calanderizationService: CalanderizationService, private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private localStorageService: LocalStorageService) {

    this.bannerDropdownOpen = new BehaviorSubject<boolean>(false);

    let dashboardGraphDisplay: "usage" | "cost" = this.localStorageService.retrieve("dashboardGraphDisplay");
    if (dashboardGraphDisplay) {
      this.graphDisplay = new BehaviorSubject(dashboardGraphDisplay);
    } else {
      this.graphDisplay = new BehaviorSubject("cost");
    }
    this.graphDisplay.subscribe(val => {
      this.localStorageService.store('dashboardGraphDisplay', val);
    });
  }

  getAccountFacilitesSummary(): AccountFacilitiesSummary {
    let facilitiesSummary: Array<FacilitySummary> = new Array();
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let allAccountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountLastBill: MonthlyData = this.calanderizationService.getLastBillEntry(allAccountMeters, true);
    facilities.forEach(facility => {
      let facilityMeterSummary: FacilitySummary = this.getFacilitySummary(facility, true, accountLastBill);
      facilitiesSummary.push(facilityMeterSummary);
    });
    return {
      facilitySummaries: facilitiesSummary,
      totalEnergyUse: _.sumBy(facilitiesSummary, 'energyUsage'),
      totalEnergyCost: _.sumBy(facilitiesSummary, 'energyCost'),
      totalNumberOfMeters: _.sumBy(facilitiesSummary, 'numberOfMeters'),
      totalEmissions: _.sumBy(facilitiesSummary, 'emissions'),
      allMetersLastBill: accountLastBill
    };
  }

  getFacilitySummary(facility: IdbFacility, inAccount: boolean, accountMetersLastBill: MonthlyData): FacilitySummary {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMetersCopy: Array<IdbUtilityMeter> = JSON.parse(JSON.stringify(accountMeters));
    let facilityMeters: Array<IdbUtilityMeter> = accountMetersCopy.filter(meter => { return meter.facilityId == facility.id });
    if (facilityMeters.length != 0) {
      let facilityLastBill: MonthlyData = this.calanderizationService.getLastBillEntry(facilityMeters, inAccount);
      if (facilityLastBill) {
        let facilityMetersDataSummary: Array<{ time: string, energyUse: number, energyCost: number }> = this.calanderizationService.getPastYearData(facilityMeters, inAccount, accountMetersLastBill);
        return {
          facility: facility,
          energyUsage: _.sumBy(facilityMetersDataSummary, 'energyUse'),
          energyCost: _.sumBy(facilityMetersDataSummary, 'energyCost'),
          emissions: _.sumBy(facilityMetersDataSummary, 'emissions'),
          numberOfMeters: facilityMeters.length,
          lastBillDate: new Date(facilityLastBill.year, (facilityLastBill.monthNumValue + 1))
        }
      } else {
        return {
          facility: facility,
          energyUsage: 0,
          energyCost: 0,
          emissions: 0,
          numberOfMeters: facilityMeters.length,
          lastBillDate: undefined
        }
      }
    }
    return {
      facility: facility,
      energyCost: 0,
      energyUsage: 0,
      emissions: 0,
      numberOfMeters: 0,
      lastBillDate: undefined
    }
  }

  getLastMonthYear(): { lastMonth: number, lastMonthYear: number } {
    let todaysDate: Date = new Date();
    let lastMonth: number;
    let lastMonthYear: number;
    if (todaysDate.getMonth() == 0) {
      lastMonth = 11;
      lastMonthYear = todaysDate.getFullYear() - 1;
    } else {
      lastMonth = todaysDate.getMonth() - 1;
      lastMonthYear = todaysDate.getFullYear();
    }
    return { lastMonth: lastMonth, lastMonthYear: lastMonthYear };
  }


  getLastMonthsEnergyUseAndCost(facility: IdbFacility, inAccount: boolean): { energyUse: number, energyCost: number } {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMetersCopy: Array<IdbUtilityMeter> = JSON.parse(JSON.stringify(accountMeters));
    let facilityMeters: Array<IdbUtilityMeter> = accountMetersCopy.filter(meter => { return meter.facilityId == facility.id });
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(facilityMeters, inAccount, false);
    let lastMonthYear: { lastMonth: number, lastMonthYear: number } = this.getLastMonthYear();
    let totalEnergyUse: number = 0;
    let totalEnergyCost: number = 0;
    calanderizedMeterData.forEach(meter => {
      let previousMonthData: MonthlyData = meter.monthlyData.find(data => { return data.monthNumValue == lastMonthYear.lastMonth && data.year == lastMonthYear.lastMonthYear });
      if (previousMonthData) {
        totalEnergyUse += previousMonthData.energyConsumption;
        totalEnergyCost += previousMonthData.energyCost;
      }
    });
    return { energyUse: totalEnergyUse, energyCost: totalEnergyCost };
  }

  getFacilitiesUtilityUsageSummaryData(facilities: Array<IdbFacility>, inAccount: boolean): UtilityUsageSummaryData {
    let accountUtilitySummaries: Array<SummaryData> = new Array();
    let facilitySummaries: Array<UtilityUsageSummaryData> = new Array();
    facilities.forEach(facility => {
      let utilityUsageSummaryData: UtilityUsageSummaryData = this.getFacilityUtilityUsageSummaryData(facility, inAccount);
      facilitySummaries.push(utilityUsageSummaryData);
    });
    let utilitySummaries: Array<SummaryData> = facilitySummaries.flatMap(summary => { return summary.utilitySummaries });
    accountUtilitySummaries = this.getUtilityUsageSummaryData(accountUtilitySummaries, utilitySummaries, 'Electricity');
    accountUtilitySummaries = this.getUtilityUsageSummaryData(accountUtilitySummaries, utilitySummaries, 'Natural Gas');
    accountUtilitySummaries = this.getUtilityUsageSummaryData(accountUtilitySummaries, utilitySummaries, 'Other Fuels');
    accountUtilitySummaries = this.getUtilityUsageSummaryData(accountUtilitySummaries, utilitySummaries, 'Other Energy');
    accountUtilitySummaries = this.getUtilityUsageSummaryData(accountUtilitySummaries, utilitySummaries, 'Water');
    accountUtilitySummaries = this.getUtilityUsageSummaryData(accountUtilitySummaries, utilitySummaries, 'Waste Water');
    accountUtilitySummaries = this.getUtilityUsageSummaryData(accountUtilitySummaries, utilitySummaries, 'Other Utility');
    let lastBills: Array<MonthlyData> = facilitySummaries.flatMap(summary => { return summary.allMetersLastBill });
    let previousMonthEnergyUse: number = _.sumBy(accountUtilitySummaries, 'previousMonthEnergyUse');
    let previousMonthEnergyCost: number = _.sumBy(accountUtilitySummaries, 'previousMonthEnergyCost');
    let previousMonthEmissions: number = _.sumBy(accountUtilitySummaries, 'previousMonthEmissions');
    let yearPriorEnergyUse: number = _.sumBy(accountUtilitySummaries, 'yearPriorEnergyUse');
    let yearPriorEnergyCost: number = _.sumBy(accountUtilitySummaries, 'yearPriorEnergyCost');
    let yearPriorEmissions: number = _.sumBy(accountUtilitySummaries, 'yearPriorEmissions');
    return {
      utilitySummaries: accountUtilitySummaries,
      total: {
        lastBillDate: _.maxBy(accountUtilitySummaries, 'lastBillDate'),
        previousMonthEnergyUse: previousMonthEnergyUse,
        previousMonthEnergyCost: previousMonthEnergyCost,
        previousMonthEmissions: previousMonthEmissions,
        averageEnergyUse: _.sumBy(accountUtilitySummaries, 'averageEnergyUse'),
        averageEnergyCost: _.sumBy(accountUtilitySummaries, 'averageEnergyCost'),
        averageEmissions: _.sumBy(accountUtilitySummaries, 'averageEmissions'),
        yearPriorEnergyUse: yearPriorEnergyUse,
        yearPriorEnergyCost: yearPriorEnergyCost,
        yearPriorEmissions: yearPriorEmissions,
        energyCostChangeSinceLastYear: previousMonthEnergyCost - yearPriorEnergyCost,
        energyUseChangeSinceLastYear: previousMonthEnergyUse - yearPriorEnergyUse,
        emissionsChangeSinceLastYear: previousMonthEmissions - yearPriorEmissions,
        utility: 'Total'
      },
      allMetersLastBill: _.maxBy(lastBills, (bill: MonthlyData) => {
        if (bill) {
          return new Date(bill.year, bill.monthNumValue)
        }
      })
    }
  }

  getUtilityUsageSummaryData(accountUtilitySummaries: Array<SummaryData>, allUtilitySummaries: Array<SummaryData>, utility: string): Array<SummaryData> {
    let filteredUtilitySummaries: Array<SummaryData> = allUtilitySummaries.filter(summary => { return summary.utility == utility });
    if (filteredUtilitySummaries.length != 0) {
      let dates: Array<Date> = filteredUtilitySummaries.map(summary => { return summary.lastBillDate });
      let previousMonthEnergyUse: number = _.sumBy(filteredUtilitySummaries, 'previousMonthEnergyUse');
      let previousMonthEnergyCost: number = _.sumBy(filteredUtilitySummaries, 'previousMonthEnergyCost');
      let previousMonthEmissions: number = _.sumBy(filteredUtilitySummaries, 'previousMonthEmissions');
      let yearPriorEnergyUse: number = _.sumBy(filteredUtilitySummaries, 'yearPriorEnergyUse');
      let yearPriorEnergyCost: number = _.sumBy(filteredUtilitySummaries, 'yearPriorEnergyCost');
      let yearPriorEmissions: number = _.sumBy(filteredUtilitySummaries, 'yearPriorEmissions');
      let summaryData: SummaryData = {
        lastBillDate: _.max(dates),
        previousMonthEnergyUse: previousMonthEnergyUse,
        previousMonthEnergyCost: previousMonthEnergyCost,
        previousMonthEmissions: previousMonthEmissions,
        averageEnergyUse: _.sumBy(filteredUtilitySummaries, 'averageEnergyUse'),
        averageEnergyCost: _.sumBy(filteredUtilitySummaries, 'averageEnergyCost'),
        averageEmissions: _.sumBy(filteredUtilitySummaries, 'averageEmissions'),
        yearPriorEnergyUse: yearPriorEnergyUse,
        yearPriorEnergyCost: yearPriorEnergyCost,
        yearPriorEmissions: yearPriorEmissions,
        energyCostChangeSinceLastYear: previousMonthEnergyCost - yearPriorEnergyCost,
        energyUseChangeSinceLastYear: previousMonthEnergyUse - yearPriorEnergyUse,
        emissionsChangeSinceLastYear: previousMonthEmissions - yearPriorEmissions,
        utility: utility
      }
      accountUtilitySummaries.push(summaryData);
    }
    return accountUtilitySummaries;
  }

  //get utility usage summaries for facility
  getFacilityUtilityUsageSummaryData(facility: IdbFacility, inAccount: boolean): UtilityUsageSummaryData {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMetersCopy: Array<IdbUtilityMeter> = JSON.parse(JSON.stringify(accountMeters));
    let facilityMeters: Array<IdbUtilityMeter> = accountMetersCopy.filter(meter => { return meter.facilityId == facility.id });
    let utilitySummaries: Array<SummaryData> = new Array();
    let allMetersLastBill: MonthlyData = this.calanderizationService.getLastBillEntry(facilityMeters, inAccount);
    utilitySummaries = this.getMetersSummaryByUtility(utilitySummaries, 'Electricity', facilityMeters, inAccount, allMetersLastBill);
    utilitySummaries = this.getMetersSummaryByUtility(utilitySummaries, 'Natural Gas', facilityMeters, inAccount, allMetersLastBill);
    utilitySummaries = this.getMetersSummaryByUtility(utilitySummaries, 'Other Fuels', facilityMeters, inAccount, allMetersLastBill);
    utilitySummaries = this.getMetersSummaryByUtility(utilitySummaries, 'Other Energy', facilityMeters, inAccount, allMetersLastBill);
    utilitySummaries = this.getMetersSummaryByUtility(utilitySummaries, 'Water', facilityMeters, inAccount, allMetersLastBill);
    utilitySummaries = this.getMetersSummaryByUtility(utilitySummaries, 'Waste Water', facilityMeters, inAccount, allMetersLastBill);
    utilitySummaries = this.getMetersSummaryByUtility(utilitySummaries, 'Other Utility', facilityMeters, inAccount, allMetersLastBill);
    let previousMonthEnergyUse: number = _.sumBy(utilitySummaries, 'previousMonthEnergyUse');
    let previousMonthEnergyCost: number = _.sumBy(utilitySummaries, 'previousMonthEnergyCost');
    let previousMonthEmissions: number = _.sumBy(utilitySummaries, 'previousMonthEmissions');
    let yearPriorEnergyUse: number = _.sumBy(utilitySummaries, 'yearPriorEnergyUse');
    let yearPriorEnergyCost: number = _.sumBy(utilitySummaries, 'yearPriorEnergyCost');
    let yearPriorEmissions: number = _.sumBy(utilitySummaries, 'yearPriorEmissions');
    return {
      utilitySummaries: utilitySummaries,
      total: {
        lastBillDate: _.maxBy(utilitySummaries, 'lastBillDate'),
        previousMonthEnergyUse: previousMonthEnergyUse,
        previousMonthEnergyCost: previousMonthEnergyCost,
        previousMonthEmissions: previousMonthEmissions,
        averageEnergyUse: _.sumBy(utilitySummaries, 'averageEnergyUse'),
        averageEnergyCost: _.sumBy(utilitySummaries, 'averageEnergyCost'),
        averageEmissions: _.sumBy(utilitySummaries, 'averageEmissions'),
        yearPriorEnergyUse: yearPriorEnergyUse,
        yearPriorEnergyCost: yearPriorEnergyCost,
        yearPriorEmissions: yearPriorEmissions,
        energyCostChangeSinceLastYear: previousMonthEnergyCost - yearPriorEnergyCost,
        energyUseChangeSinceLastYear: previousMonthEnergyUse - yearPriorEnergyUse,
        emissionsChangeSinceLastYear: previousMonthEmissions - yearPriorEmissions,
        utility: 'Total'
      },
      allMetersLastBill: allMetersLastBill
    }
  }

  getMetersSummaryByUtility(utilitySummaries: Array<SummaryData>, utilityType: string, facilityMeters: Array<IdbUtilityMeter>, inAccount: boolean, allMetersLastBill: MonthlyData): Array<SummaryData> {
    let utilitySummary: SummaryData = this.getMetersSummary(facilityMeters, utilityType, inAccount, allMetersLastBill);
    if (utilitySummary.lastBillDate) {
      utilitySummaries.push(utilitySummary);
    }
    return utilitySummaries;
  }

  getMetersSummary(facilityMeters: Array<IdbUtilityMeter>, utility: string, inAccount: boolean, allMetersLastBill: MonthlyData): SummaryData {
    let utilityMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == utility });
    if (utilityMeters.length != 0) {
      let lastYearData: Array<LastYearData> = this.calanderizationService.getPastYearData(utilityMeters, inAccount, allMetersLastBill);
      let lastBillForTheseMeters: MonthlyData = this.calanderizationService.getLastBillEntry(utilityMeters, inAccount);
      if (lastBillForTheseMeters) {
        let yearPriorBill: Array<MonthlyData> = this.calanderizationService.getYearPriorBillEntry(utilityMeters, inAccount, lastBillForTheseMeters);
        if (lastYearData.length != 0) {
          let previousMonthData: LastYearData = _.maxBy(lastYearData, 'date');
          let totalEnergyUseFromLastYear: number = _.sumBy(lastYearData, 'energyUse');
          let totalEnergyCostFromLastYear: number = _.sumBy(lastYearData, 'energyCost');
          let totalEmissionsFromLastYear: number = _.sumBy(lastYearData, 'emissions');
          let yearPriorEnergyCost: number = _.sumBy(yearPriorBill, 'energyCost');
          let yearPriorEnergyUse: number = _.sumBy(yearPriorBill, 'energyUse');
          let yearPriorEmissions: number = _.sumBy(yearPriorBill, 'emissions');
          return {
            lastBillDate: new Date(lastBillForTheseMeters.year, lastBillForTheseMeters.monthNumValue),
            previousMonthEnergyUse: previousMonthData.energyUse,
            previousMonthEnergyCost: previousMonthData.energyCost,
            previousMonthEmissions: previousMonthData.emissions,
            averageEnergyUse: (totalEnergyUseFromLastYear / lastYearData.length),
            averageEnergyCost: (totalEnergyCostFromLastYear / lastYearData.length),
            averageEmissions: (totalEmissionsFromLastYear / lastYearData.length),
            yearPriorEnergyCost: yearPriorEnergyCost,
            yearPriorEnergyUse: yearPriorEnergyUse,
            yearPriorEmissions: yearPriorEmissions,
            energyCostChangeSinceLastYear: previousMonthData.energyCost - yearPriorEnergyCost,
            energyUseChangeSinceLastYear: previousMonthData.energyUse - yearPriorEnergyUse,
            emissionsChangeSinceLastYear: previousMonthData.emissions - yearPriorEmissions,
            utility: utility
          };
        } else {
          return {
            lastBillDate: new Date(lastBillForTheseMeters.year, lastBillForTheseMeters.monthNumValue),
            previousMonthEnergyUse: 0,
            previousMonthEnergyCost: 0,
            previousMonthEmissions: 0,
            averageEnergyUse: 0,
            averageEnergyCost: 0,
            averageEmissions: 0,
            yearPriorEnergyCost: 0,
            yearPriorEnergyUse: 0,
            yearPriorEmissions: 0,
            energyUseChangeSinceLastYear: 0,
            energyCostChangeSinceLastYear: 0,
            emissionsChangeSinceLastYear: 0,
            utility: utility
          }
        }
      }
    }
    return {
      lastBillDate: undefined,
      previousMonthEnergyUse: 0,
      previousMonthEnergyCost: 0,
      previousMonthEmissions: 0,
      averageEnergyUse: 0,
      averageEnergyCost: 0,
      averageEmissions: 0,
      yearPriorEnergyCost: 0,
      yearPriorEnergyUse: 0,
      yearPriorEmissions: 0,
      energyUseChangeSinceLastYear: 0,
      energyCostChangeSinceLastYear: 0,
      emissionsChangeSinceLastYear: 0,
      utility: utility
    }
  }

  getFacilityMetersSummary(inAccount: boolean): FacilityMeterSummaryData {
    let facilityMetersSummary: Array<MeterSummary> = new Array();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
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


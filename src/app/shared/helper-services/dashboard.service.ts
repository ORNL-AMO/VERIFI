import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';
import { CalanderizationService } from './calanderization.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizedMeter, LastYearData, MonthlyData } from 'src/app/models/calanderization';
import { AccountFacilitiesSummary, FacilityMeterSummaryData, SummaryData, UtilityUsageSummaryData } from 'src/app/models/dashboard';
import { MeterSummaryService } from './meter-summary.service';
import { SourceOptions } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {



  graphDisplay: BehaviorSubject<"usage" | "cost" | "emissions">;
  accountFacilitiesSummary: BehaviorSubject<AccountFacilitiesSummary>;
  accountUtilityUsageSummaryData: BehaviorSubject<UtilityUsageSummaryData>;
  facilityMeterSummaryData: BehaviorSubject<FacilityMeterSummaryData>;
  facilityUtilityUsageSummaryData: BehaviorSubject<UtilityUsageSummaryData>;
  calanderizedFacilityMeters: BehaviorSubject<Array<CalanderizedMeter>>;
  calanderizedAccountMeters: BehaviorSubject<Array<CalanderizedMeter>>;
  emissionsDisplay: BehaviorSubject<"location" | "market">;
  constructor(private utilityMeterDbService: UtilityMeterdbService,
    private calanderizationService: CalanderizationService,
    private localStorageService: LocalStorageService,
    private meterSummaryService: MeterSummaryService) {

    this.accountFacilitiesSummary = new BehaviorSubject<AccountFacilitiesSummary>(undefined);
    this.accountUtilityUsageSummaryData = new BehaviorSubject<UtilityUsageSummaryData>(undefined);
    this.facilityMeterSummaryData = new BehaviorSubject<FacilityMeterSummaryData>(undefined);
    this.facilityUtilityUsageSummaryData = new BehaviorSubject<UtilityUsageSummaryData>(undefined);
    this.calanderizedFacilityMeters = new BehaviorSubject<Array<CalanderizedMeter>>([]);
    this.calanderizedAccountMeters = new BehaviorSubject<Array<CalanderizedMeter>>([]);

    let dashboardGraphDisplay: "usage" | "cost" | "emissions" = this.localStorageService.retrieve("dashboardGraphDisplay");
    if (dashboardGraphDisplay) {
      this.graphDisplay = new BehaviorSubject(dashboardGraphDisplay);
    } else {
      this.graphDisplay = new BehaviorSubject("cost");
    }
    this.graphDisplay.subscribe(val => {
      this.localStorageService.store('dashboardGraphDisplay', val);
    });

    let emissionsDisplay: "location" | "market" = this.localStorageService.retrieve("emissionsDisplay");
    if (emissionsDisplay) {
      this.emissionsDisplay = new BehaviorSubject<"location" | "market">(emissionsDisplay);
    } else {
      this.emissionsDisplay = new BehaviorSubject<"location" | "market">("location");
    }

    this.emissionsDisplay.subscribe(val => {
      this.localStorageService.store("emissionsDisplay", val);
    });
  }


  setAccountFacilitiesSummary() {
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(meters, true, true);
    this.calanderizedAccountMeters.next(JSON.parse(JSON.stringify(calanderizedMeters)))
    let accountFacilitiesSummary: AccountFacilitiesSummary = this.meterSummaryService.getDashboardAccountFacilitiesSummary(JSON.parse(JSON.stringify(calanderizedMeters)))
    this.accountFacilitiesSummary.next(accountFacilitiesSummary);
    let accountUtilityUsageSummaryData: UtilityUsageSummaryData = this.getAccountUtilityUsageSummary(JSON.parse(JSON.stringify(calanderizedMeters)), accountFacilitiesSummary.allMetersLastBill, true);
    this.accountUtilityUsageSummaryData.next(accountUtilityUsageSummaryData);
  }

  getAccountUtilityUsageSummary(calanderizedMeters: Array<CalanderizedMeter>, allMetersLastBill: MonthlyData, inAccount: boolean): UtilityUsageSummaryData {
    let accountUtilitySummaries: Array<SummaryData> = new Array();

    SourceOptions.forEach(source => {
      let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.source == source });
      if (sourceMeters.length != 0) {
        let pastYearData: Array<LastYearData> = this.calanderizationService.getPastYearData(undefined, inAccount, allMetersLastBill, sourceMeters, undefined);
        let yearPriorBill: Array<MonthlyData> = this.calanderizationService.getYearPriorBillEntryFromCalanderizedMeterData(sourceMeters, allMetersLastBill);
        let lastBill: MonthlyData = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(sourceMeters)
        if (lastBill) {
          let previousMonthData: LastYearData = _.maxBy(pastYearData, 'date');
          let totalEnergyUseFromLastYear: number = _.sumBy(pastYearData, (data) => { return this.getSumValue(data.energyUse) });
          let totalEnergyCostFromLastYear: number = _.sumBy(pastYearData, (data) => { return this.getSumValue(data.energyCost) });
          let totalMarketEmissionsFromLastYear: number = _.sumBy(pastYearData, (data) => { return this.getSumValue(data.marketEmissions) });
          let totalLocationEmissionsFromLastYear: number = _.sumBy(pastYearData, (data) => { return this.getSumValue(data.locationEmissions) });
          let yearPriorEnergyCost: number = _.sumBy(yearPriorBill, (data) => { return this.getSumValue(data.energyCost) });
          let yearPriorEnergyUse: number = _.sumBy(yearPriorBill, (data) => { return this.getSumValue(data.energyUse) });
          let yearPriorMarketEmissions: number = _.sumBy(yearPriorBill, (data) => { return this.getSumValue(data.marketEmissions) });
          let yearPriorLocationEmissions: number = _.sumBy(yearPriorBill, (data) => { return this.getSumValue(data.locationEmissions) });

          let previousMonthMarketEmissions: number = previousMonthData.marketEmissions;
          let marketEmissionsChangeSinceLastYear: number = previousMonthData.marketEmissions - yearPriorMarketEmissions;

          let previousMonthLocationEmissions: number = previousMonthData.locationEmissions;
          let locationEmissionsChangeSinceLastYear: number = previousMonthData.locationEmissions - yearPriorLocationEmissions;
          //TODO: consumption
          accountUtilitySummaries.push({
            lastBillDate: new Date(lastBill.date),
            previousMonthEnergyUse: previousMonthData.energyUse,
            previousMonthEnergyCost: previousMonthData.energyCost,
            previousMonthMarketEmissions: previousMonthMarketEmissions,
            previousMonthLocationEmissions: previousMonthLocationEmissions,
            previousMonthConsumption: 0,
            averageEnergyUse: (totalEnergyUseFromLastYear / pastYearData.length),
            averageEnergyCost: (totalEnergyCostFromLastYear / pastYearData.length),
            averageLocationEmissions: (totalLocationEmissionsFromLastYear / pastYearData.length),
            averageMarketEmissions: (totalMarketEmissionsFromLastYear / pastYearData.length),
            averageConsumption: 0,
            yearPriorEnergyCost: yearPriorEnergyCost,
            yearPriorEnergyUse: yearPriorEnergyUse,
            yearPriorMarketEmissions: yearPriorMarketEmissions,
            yearPriorLocationEmissions: yearPriorLocationEmissions,
            yearPriorConsumption: 0,
            energyCostChangeSinceLastYear: previousMonthData.energyCost - yearPriorEnergyCost,
            energyUseChangeSinceLastYear: previousMonthData.energyUse - yearPriorEnergyUse,
            locationEmissionsChangeSinceLastYear: locationEmissionsChangeSinceLastYear - yearPriorLocationEmissions,
            marketEmissionsChangeSinceLastYear: marketEmissionsChangeSinceLastYear - yearPriorMarketEmissions,
            consumptionChangeSinceLastYear: 0,
            utility: source
          });
        }
      }
    });

    let previousMonthEnergyUse: number = _.sumBy(accountUtilitySummaries, (data) => { return this.getSumValue(data.previousMonthEnergyUse) });
    let previousMonthEnergyCost: number = _.sumBy(accountUtilitySummaries, (data) => { return this.getSumValue(data.previousMonthEnergyCost) });
    let previousMonthMarketEmissions: number = _.sumBy(accountUtilitySummaries, (data) => { return this.getSumValue(data.previousMonthMarketEmissions) });
    let previousMonthLocationEmissions: number = _.sumBy(accountUtilitySummaries, (data) => { return this.getSumValue(data.previousMonthLocationEmissions) });
    let yearPriorEnergyUse: number = _.sumBy(accountUtilitySummaries, (data) => { return this.getSumValue(data.yearPriorEnergyUse) });
    let yearPriorEnergyCost: number = _.sumBy(accountUtilitySummaries, (data) => { return this.getSumValue(data.yearPriorEnergyCost) });
    let yearPriorMarketEmissions: number = _.sumBy(accountUtilitySummaries, (data) => { return this.getSumValue(data.yearPriorMarketEmissions) });
    let yearPriorLocationEmissions: number = _.sumBy(accountUtilitySummaries, (data) => { return this.getSumValue(data.yearPriorLocationEmissions) });

    return {
      utilitySummaries: accountUtilitySummaries,
      total: {
        lastBillDate: _.maxBy(accountUtilitySummaries, 'lastBillDate'),
        previousMonthEnergyUse: previousMonthEnergyUse,
        previousMonthEnergyCost: previousMonthEnergyCost,
        previousMonthLocationEmissions: previousMonthLocationEmissions,
        previousMonthMarketEmissions: previousMonthMarketEmissions,
        previousMonthConsumption: 0,
        averageEnergyUse: _.sumBy(accountUtilitySummaries, (data) => { return this.getSumValue(data.averageEnergyUse) }),
        averageEnergyCost: _.sumBy(accountUtilitySummaries, (data) => { return this.getSumValue(data.averageEnergyCost) }),
        averageLocationEmissions: _.sumBy(accountUtilitySummaries, (data) => { return this.getSumValue(data.averageLocationEmissions) }),
        averageMarketEmissions: _.sumBy(accountUtilitySummaries, (data) => { return this.getSumValue(data.averageMarketEmissions) }),
        averageConsumption: 0,
        yearPriorEnergyUse: yearPriorEnergyUse,
        yearPriorEnergyCost: yearPriorEnergyCost,
        yearPriorLocationEmissions: yearPriorLocationEmissions,
        yearPriorMarketEmissions: yearPriorMarketEmissions,
        yearPriorConsumption: 0,
        energyCostChangeSinceLastYear: previousMonthEnergyCost - yearPriorEnergyCost,
        energyUseChangeSinceLastYear: previousMonthEnergyUse - yearPriorEnergyUse,
        locationEmissionsChangeSinceLastYear: previousMonthLocationEmissions - yearPriorLocationEmissions,
        marketEmissionsChangeSinceLastYear: previousMonthMarketEmissions - yearPriorMarketEmissions,
        consumptionChangeSinceLastYear: 0,
        utility: 'Total'
      },
      allMetersLastBill: allMetersLastBill
    }
  }

  setFacilityDashboardSummary() {
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(meters, false, true);
    this.calanderizedFacilityMeters.next(calanderizedMeters);
    let lastBill: MonthlyData = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(calanderizedMeters);
    let facilityMeterSummaryData: FacilityMeterSummaryData = this.meterSummaryService.getDashboardFacilityMeterSummary(calanderizedMeters, lastBill);
    let utilityUsageSummaryData: UtilityUsageSummaryData = this.getAccountUtilityUsageSummary(calanderizedMeters, lastBill, false);

    this.facilityMeterSummaryData.next(facilityMeterSummaryData);
    this.facilityUtilityUsageSummaryData.next(utilityUsageSummaryData);
  }



  getSumValue(val: number): number {
    if (isNaN(val) == false) {
      return val;
    } else {
      return 0;
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
    let facilityMeters: Array<IdbUtilityMeter> = accountMetersCopy.filter(meter => { return meter.facilityId == facility.guid });
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
    let previousMonthMarketEmissions: number = _.sumBy(accountUtilitySummaries, 'previousMonthMarketEmissions');
    let previousMonthLocationEmissions: number = _.sumBy(accountUtilitySummaries, 'previousMonthLocationEmissions');
    let yearPriorEnergyUse: number = _.sumBy(accountUtilitySummaries, 'yearPriorEnergyUse');
    let yearPriorEnergyCost: number = _.sumBy(accountUtilitySummaries, 'yearPriorEnergyCost');
    let yearPriorMarketEmissions: number = _.sumBy(accountUtilitySummaries, 'yearPriorMarketEmissions');
    let yearPriorLocationEmissions: number = _.sumBy(accountUtilitySummaries, 'yearPriorLocationEmissions');

    return {
      utilitySummaries: accountUtilitySummaries,
      total: {
        lastBillDate: _.maxBy(accountUtilitySummaries, 'lastBillDate'),
        previousMonthEnergyUse: previousMonthEnergyUse,
        previousMonthEnergyCost: previousMonthEnergyCost,
        previousMonthMarketEmissions: previousMonthMarketEmissions,
        previousMonthLocationEmissions: previousMonthLocationEmissions,
        previousMonthConsumption: 0,
        averageEnergyUse: _.sumBy(accountUtilitySummaries, 'averageEnergyUse'),
        averageEnergyCost: _.sumBy(accountUtilitySummaries, 'averageEnergyCost'),
        averageLocationEmissions: _.sumBy(accountUtilitySummaries, 'averageLocationEmissions'),
        averageMarketEmissions: _.sumBy(accountUtilitySummaries, 'averageMarketEmissions'),
        averageConsumption: 0,
        yearPriorEnergyUse: yearPriorEnergyUse,
        yearPriorEnergyCost: yearPriorEnergyCost,
        yearPriorMarketEmissions: yearPriorMarketEmissions,
        yearPriorLocationEmissions: yearPriorLocationEmissions,
        yearPriorConsumption: 0,
        energyCostChangeSinceLastYear: previousMonthEnergyCost - yearPriorEnergyCost,
        energyUseChangeSinceLastYear: previousMonthEnergyUse - yearPriorEnergyUse,
        locationEmissionsChangeSinceLastYear: previousMonthLocationEmissions - yearPriorLocationEmissions,
        marketEmissionsChangeSinceLastYear: previousMonthMarketEmissions - yearPriorMarketEmissions,
        consumptionChangeSinceLastYear: 0,
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
      let previousMonthEnergyUse: number = _.sumBy(accountUtilitySummaries, 'previousMonthEnergyUse');
      let previousMonthEnergyCost: number = _.sumBy(accountUtilitySummaries, 'previousMonthEnergyCost');
      let previousMonthMarketEmissions: number = _.sumBy(accountUtilitySummaries, 'previousMonthMarketEmissions');
      let previousMonthLocationEmissions: number = _.sumBy(accountUtilitySummaries, 'previousMonthLocationEmissions');
      let yearPriorEnergyUse: number = _.sumBy(accountUtilitySummaries, 'yearPriorEnergyUse');
      let yearPriorEnergyCost: number = _.sumBy(accountUtilitySummaries, 'yearPriorEnergyCost');
      let yearPriorMarketEmissions: number = _.sumBy(accountUtilitySummaries, 'yearPriorMarketEmissions');
      let yearPriorLocationEmissions: number = _.sumBy(accountUtilitySummaries, 'yearPriorLocationEmissions');
      let summaryData: SummaryData = {
        lastBillDate: _.max(dates),
        previousMonthEnergyUse: previousMonthEnergyUse,
        previousMonthEnergyCost: previousMonthEnergyCost,
        previousMonthMarketEmissions: previousMonthMarketEmissions,
        previousMonthLocationEmissions: previousMonthLocationEmissions,
        previousMonthConsumption: 0,
        averageEnergyUse: _.sumBy(filteredUtilitySummaries, 'averageEnergyUse'),
        averageEnergyCost: _.sumBy(filteredUtilitySummaries, 'averageEnergyCost'),
        averageLocationEmissions: _.sumBy(accountUtilitySummaries, 'averageLocationEmissions'),
        averageMarketEmissions: _.sumBy(accountUtilitySummaries, 'averageMarketEmissions'),
        averageConsumption: 0,
        yearPriorEnergyUse: yearPriorEnergyUse,
        yearPriorEnergyCost: yearPriorEnergyCost,
        yearPriorMarketEmissions: yearPriorMarketEmissions,
        yearPriorLocationEmissions: yearPriorLocationEmissions,
        yearPriorConsumption: 0,
        energyCostChangeSinceLastYear: previousMonthEnergyCost - yearPriorEnergyCost,
        energyUseChangeSinceLastYear: previousMonthEnergyUse - yearPriorEnergyUse,
        locationEmissionsChangeSinceLastYear: previousMonthLocationEmissions - yearPriorLocationEmissions,
        marketEmissionsChangeSinceLastYear: previousMonthMarketEmissions - yearPriorMarketEmissions,
        consumptionChangeSinceLastYear: 0,
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
    let facilityMeters: Array<IdbUtilityMeter> = accountMetersCopy.filter(meter => { return meter.facilityId == facility.guid });
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
    let previousMonthMarketEmissions: number = _.sumBy(utilitySummaries, 'previousMonthMarketEmissions');
    let previousMonthLocationEmissions: number = _.sumBy(utilitySummaries, 'previousMonthLocationEmissions');
    let yearPriorEnergyUse: number = _.sumBy(utilitySummaries, 'yearPriorEnergyUse');
    let yearPriorEnergyCost: number = _.sumBy(utilitySummaries, 'yearPriorEnergyCost');
    let yearPriorMarketEmissions: number = _.sumBy(utilitySummaries, 'yearPriorMarketEmissions');
    let yearPriorLocationEmissions: number = _.sumBy(utilitySummaries, 'yearPriorLocationEmissions');
    return {
      utilitySummaries: utilitySummaries,
      total: {
        lastBillDate: _.maxBy(utilitySummaries, 'lastBillDate'),
        previousMonthEnergyUse: previousMonthEnergyUse,
        previousMonthEnergyCost: previousMonthEnergyCost,
        previousMonthMarketEmissions: previousMonthMarketEmissions,
        previousMonthLocationEmissions: previousMonthLocationEmissions,
        previousMonthConsumption: 0,
        averageEnergyUse: _.sumBy(utilitySummaries, 'averageEnergyUse'),
        averageEnergyCost: _.sumBy(utilitySummaries, 'averageEnergyCost'),
        averageLocationEmissions: _.sumBy(utilitySummaries, 'averageLocationEmissions'),
        averageMarketEmissions: _.sumBy(utilitySummaries, 'averageMarketEmissions'),
        averageConsumption: 0,
        yearPriorEnergyUse: yearPriorEnergyUse,
        yearPriorEnergyCost: yearPriorEnergyCost,
        yearPriorMarketEmissions: yearPriorMarketEmissions,
        yearPriorLocationEmissions: yearPriorLocationEmissions,
        yearPriorConsumption: 0,
        energyCostChangeSinceLastYear: previousMonthEnergyCost - yearPriorEnergyCost,
        energyUseChangeSinceLastYear: previousMonthEnergyUse - yearPriorEnergyUse,
        locationEmissionsChangeSinceLastYear: previousMonthLocationEmissions - yearPriorLocationEmissions,
        marketEmissionsChangeSinceLastYear: previousMonthMarketEmissions - yearPriorMarketEmissions,
        consumptionChangeSinceLastYear: 0,
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
          let totalMarketEmissionsFromLastYear: number = _.sumBy(lastYearData, 'marketEmissions');
          let totalLocationEmissionsFromLastYear: number = _.sumBy(lastYearData, 'locationEmissions');
          let yearPriorEnergyCost: number = _.sumBy(yearPriorBill, 'energyCost');
          let yearPriorEnergyUse: number = _.sumBy(yearPriorBill, 'energyUse');
          let yearPriorMarketEmissions: number = _.sumBy(yearPriorBill, 'marketEmissions');
          let yearPriorLocationEmissions: number = _.sumBy(yearPriorBill, 'locationEmissions');
          let previousMonthMarketEmissions: number = previousMonthData.marketEmissions;
          let previousMonthLocationEmissions: number = previousMonthData.locationEmissions;
          let locationEmissionsChangeSinceLastYear: number = previousMonthData.locationEmissions - yearPriorLocationEmissions;
          let marketEmissionsChangeSinceLastYear: number = previousMonthData.marketEmissions - yearPriorMarketEmissions;
          return {
            lastBillDate: new Date(lastBillForTheseMeters.year, lastBillForTheseMeters.monthNumValue),
            previousMonthEnergyUse: previousMonthData.energyUse,
            previousMonthEnergyCost: previousMonthData.energyCost,
            previousMonthMarketEmissions: previousMonthMarketEmissions,
            previousMonthLocationEmissions: previousMonthLocationEmissions,
            previousMonthConsumption: 0,
            averageEnergyUse: (totalEnergyUseFromLastYear / lastYearData.length),
            averageEnergyCost: (totalEnergyCostFromLastYear / lastYearData.length),
            averageLocationEmissions: (totalLocationEmissionsFromLastYear / lastYearData.length),
            averageMarketEmissions: (totalMarketEmissionsFromLastYear / lastYearData.length),
            averageConsumption: 0,
            yearPriorEnergyCost: yearPriorEnergyCost,
            yearPriorEnergyUse: yearPriorEnergyUse,
            yearPriorMarketEmissions: yearPriorMarketEmissions,
            yearPriorLocationEmissions: yearPriorLocationEmissions,
            yearPriorConsumption: 0,
            energyCostChangeSinceLastYear: previousMonthData.energyCost - yearPriorEnergyCost,
            energyUseChangeSinceLastYear: previousMonthData.energyUse - yearPriorEnergyUse,
            locationEmissionsChangeSinceLastYear: locationEmissionsChangeSinceLastYear,
            marketEmissionsChangeSinceLastYear: marketEmissionsChangeSinceLastYear,
            consumptionChangeSinceLastYear: 0,
            utility: utility
          };
        } else {
          return {
            lastBillDate: new Date(lastBillForTheseMeters.year, lastBillForTheseMeters.monthNumValue),
            previousMonthEnergyUse: 0,
            previousMonthEnergyCost: 0,
            previousMonthMarketEmissions: 0,
            previousMonthLocationEmissions: 0,
            previousMonthConsumption: 0,
            averageEnergyUse: 0,
            averageEnergyCost: 0,
            averageLocationEmissions: 0,
            averageMarketEmissions: 0,
            averageConsumption: 0,
            yearPriorEnergyCost: 0,
            yearPriorEnergyUse: 0,
            yearPriorLocationEmissions: 0,
            yearPriorMarketEmissions: 0,
            yearPriorConsumption: 0,
            energyUseChangeSinceLastYear: 0,
            energyCostChangeSinceLastYear: 0,
            locationEmissionsChangeSinceLastYear: 0,
            marketEmissionsChangeSinceLastYear: 0,
            consumptionChangeSinceLastYear: 0,
            utility: utility
          }
        }
      }
    }
    return {
      lastBillDate: undefined,
      previousMonthEnergyUse: 0,
      previousMonthEnergyCost: 0,
      previousMonthMarketEmissions: 0,
      previousMonthLocationEmissions: 0,
      previousMonthConsumption: 0,
      averageEnergyUse: 0,
      averageEnergyCost: 0,
      averageLocationEmissions: 0,
      averageMarketEmissions: 0,
      averageConsumption: 0,
      yearPriorEnergyCost: 0,
      yearPriorEnergyUse: 0,
      yearPriorLocationEmissions: 0,
      yearPriorMarketEmissions: 0,
      yearPriorConsumption: 0,
      energyUseChangeSinceLastYear: 0,
      energyCostChangeSinceLastYear: 0,
      locationEmissionsChangeSinceLastYear: 0,
      marketEmissionsChangeSinceLastYear: 0,
      consumptionChangeSinceLastYear: 0,
      utility: utility
    }
  }
}


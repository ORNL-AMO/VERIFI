import { Injectable } from '@angular/core';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter, LastYearData, MonthlyData } from 'src/app/models/calanderization';
import { AccountFacilitiesSummary, FacilityMeterSummaryData, FacilitySummary, MeterSummary } from 'src/app/models/dashboard';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup, MeterSource } from 'src/app/models/idb';
import { CalanderizationService } from './calanderization.service';
import * as _ from 'lodash';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { OverviewReportService } from 'src/app/account/overview-report/overview-report.service';
import { ReportOptions } from 'src/app/models/overview-report';

@Injectable({
  providedIn: 'root'
})
export class MeterSummaryService {

  constructor(private calanderizationService: CalanderizationService, private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService, private overviewReportService: OverviewReportService) { }

  getFacilityMetersSummary(inAccount: boolean, facilityMeters: Array<IdbUtilityMeter>, reportOptions?: ReportOptions): FacilityMeterSummaryData {
    let facilityMetersSummary: Array<MeterSummary> = new Array();
    let allMetersLastBill: MonthlyData = this.calanderizationService.getLastBillEntry(facilityMeters, inAccount, reportOptions);
    //TODO: Add fiscal year math..?
    if (reportOptions) {
      allMetersLastBill = {
        month: 'Dec',
        monthNumValue: 11,
        year: reportOptions.targetYear,
        fiscalYear: undefined,
        energyConsumption: undefined,
        energyUse: undefined,
        energyCost: undefined,
        date: new Date(reportOptions.targetYear, 11),
        marketEmissions: undefined,
        locationEmissions: undefined,
        excessRECs: undefined,
        excessRECsEmissions: undefined,
        RECs: undefined
      }
    }
    facilityMeters.forEach(meter => {
      let summary: MeterSummary = this.getMeterSummary(meter, inAccount, allMetersLastBill, reportOptions);
      facilityMetersSummary.push(summary);
    });
    return {
      meterSummaries: facilityMetersSummary,
      totalEnergyUse: _.sumBy(facilityMetersSummary, 'energyUsage'),
      totalEnergyCost: _.sumBy(facilityMetersSummary, 'energyCost'),
      totalMarketEmissions: _.sumBy(facilityMetersSummary, 'marketEmissions'),
      totalLocationEmissions: _.sumBy(facilityMetersSummary, 'locationEmissions'),
      allMetersLastBill: allMetersLastBill,
      totalConsumption: 0
    };
  }

  getMeterSummary(meter: IdbUtilityMeter, inAccount: boolean, allMetersLastBill: MonthlyData, reportOptions?: ReportOptions): MeterSummary {
    let lastBill: MonthlyData = this.calanderizationService.getLastBillEntry([meter], inAccount, reportOptions);
    let lastYearData: Array<LastYearData> = this.calanderizationService.getPastYearData([meter], inAccount, allMetersLastBill, undefined, reportOptions);
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
      marketEmissions: _.sumBy(lastYearData, 'marketEmissions'),
      locationEmissions: _.sumBy(lastYearData, 'locationEmissions'),
      lastBill: lastBill,
      groupName: groupName,
      lastBillDate: lastBillDate,
      consumption: 0
    }
  }

  getDashboardFacilityMeterSummary(calanderizedMeters: Array<CalanderizedMeter>, lastBill: MonthlyData): FacilityMeterSummaryData {
    let facilityMetersSummary: Array<MeterSummary> = new Array();
    // let lastBill: MonthlyData = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(calanderizedMeters);
    calanderizedMeters.forEach(cMeter => {
      let summary: MeterSummary = this.getDashboardMeterSummary(cMeter, false, lastBill);
      facilityMetersSummary.push(summary);
    });
    return {
      meterSummaries: facilityMetersSummary,
      totalEnergyUse: _.sumBy(facilityMetersSummary, (data) => { return this.getSumValue(data.energyUsage) }),
      totalEnergyCost: _.sumBy(facilityMetersSummary, (data) => { return this.getSumValue(data.energyCost) }),
      totalMarketEmissions: _.sumBy(facilityMetersSummary, (data) => { return this.getSumValue(data.marketEmissions) }),
      totalLocationEmissions: _.sumBy(facilityMetersSummary, (data) => { return this.getSumValue(data.locationEmissions) }),
      allMetersLastBill: lastBill,
      totalConsumption: 0
    };
  }

  getDashboardMeterSummary(cMeter: CalanderizedMeter, inAccount: boolean, allMetersLastBill: MonthlyData, reportOptions?: ReportOptions): MeterSummary {
    let lastBill: MonthlyData = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData([cMeter]);
    let lastYearData: Array<LastYearData> = this.calanderizationService.getPastYearData(undefined, inAccount, allMetersLastBill, [cMeter], reportOptions);
    let group: IdbUtilityMeterGroup = this.utilityMeterGroupDbService.getGroupById(cMeter.meter.groupId);
    let groupName: string = 'Ungrouped';
    if (group) {
      groupName = group.name;
    }
    let lastBillDate: Date;
    if (lastBill) {
      lastBillDate = new Date(lastBill.year, lastBill.monthNumValue + 1);
    }
    return {
      meter: cMeter.meter,
      energyUsage: _.sumBy(lastYearData, (data) => { return this.getSumValue(data.energyUse) }),
      energyCost: _.sumBy(lastYearData, (data) => { return this.getSumValue(data.energyCost) }),
      marketEmissions: _.sumBy(lastYearData, (data) => { return this.getSumValue(data.marketEmissions) }),
      locationEmissions: _.sumBy(lastYearData, (data) => { return this.getSumValue(data.locationEmissions) }),
      lastBill: lastBill,
      groupName: groupName,
      lastBillDate: lastBillDate,
      consumption: 0
    }
  }

  getDashboardAccountFacilitiesSummary(calanderizedMeters: Array<CalanderizedMeter>): AccountFacilitiesSummary {
    let facilitiesSummary: Array<FacilitySummary> = new Array();
    let accountLastBill: MonthlyData = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(calanderizedMeters);
    if (accountLastBill) {
      let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      facilities.forEach(facility => {
        let facilityMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.facilityId == facility.guid });
        if (facilityMeters.length != 0) {
          let facilityLastBill: MonthlyData = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(facilityMeters);
          let facilityMetersDataSummary: Array<{ time: string, energyUse: number, energyCost: number }> = this.calanderizationService.getPastYearData(undefined, true, accountLastBill, facilityMeters, undefined);
          facilitiesSummary.push({
            facility: facility,
            energyUsage: _.sumBy(facilityMetersDataSummary, (data) => { return this.getSumValue(data.energyUse) }),
            energyCost: _.sumBy(facilityMetersDataSummary, (data) => { return this.getSumValue(data.energyCost) }),
            marketEmissions: _.sumBy(facilityMetersDataSummary, (data) => { return this.getSumValue(data.marketEmissions) }),
            locationEmissions: _.sumBy(facilityMetersDataSummary, (data) => { return this.getSumValue(data.locationEmissions) }),
            consumption: _.sumBy(facilityMetersDataSummary, (data) => { return this.getSumValue(data.energyConsumption) }),
            numberOfMeters: facilityMeters.length,
            lastBillDate: new Date(facilityLastBill.year, (facilityLastBill.monthNumValue + 1))
          })
        }
      })
    }
    return {
      facilitySummaries: facilitiesSummary,
      totalEnergyUse: _.sumBy(facilitiesSummary, (data) => { return this.getSumValue(data.energyUsage) }),
      totalEnergyCost: _.sumBy(facilitiesSummary, (data) => { return this.getSumValue(data.energyCost) }),
      totalNumberOfMeters: _.sumBy(facilitiesSummary, (data) => { return this.getSumValue(data.numberOfMeters) }),
      totalMarketEmissions: _.sumBy(facilitiesSummary, (data) => { return this.getSumValue(data.marketEmissions) }),
      totalLocationEmissions: _.sumBy(facilitiesSummary, (data) => { return this.getSumValue(data.locationEmissions) }),
      totalConsumption: _.sumBy(facilitiesSummary, (data) => { return this.getSumValue(data.energyConsumption) }),
      allMetersLastBill: accountLastBill
    };

  }


  getSumValue(val: number): number {
    if (isNaN(val) == false) {
      return val;
    } else {
      return 0;
    }
  }


  getAccountFacilitesSummary(reportOptions?: ReportOptions): AccountFacilitiesSummary {
    console.log('GET ACCOUNT FACILITIES SUMMARY')
    let facilitiesSummary: Array<FacilitySummary> = new Array();
    let allAccountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (!reportOptions) {
      let accountLastBill: MonthlyData = this.calanderizationService.getLastBillEntry(allAccountMeters, true, reportOptions);
      accountFacilites.forEach(facility => {
        let facilityMeterSummary: FacilitySummary = this.getFacilitySummary(facility, true, accountLastBill, reportOptions);
        facilitiesSummary.push(facilityMeterSummary);
      });
      return {
        facilitySummaries: facilitiesSummary,
        totalEnergyUse: _.sumBy(facilitiesSummary, 'energyUsage'),
        totalEnergyCost: _.sumBy(facilitiesSummary, 'energyCost'),
        totalNumberOfMeters: _.sumBy(facilitiesSummary, 'numberOfMeters'),
        totalMarketEmissions: _.sumBy(facilitiesSummary, 'marketEmissions'),
        totalLocationEmissions: _.sumBy(facilitiesSummary, 'locationEmissions'),
        totalConsumption: _.sumBy(facilitiesSummary, 'consumption'),
        allMetersLastBill: accountLastBill
      };
    } else {
      //TODO: Add fiscal year..?
      let accountTargetYearBill: MonthlyData = {
        month: 'Dec',
        monthNumValue: 11,
        year: reportOptions.targetYear,
        fiscalYear: undefined,
        energyConsumption: undefined,
        energyUse: undefined,
        energyCost: undefined,
        date: new Date(reportOptions.targetYear, 11),
        marketEmissions: undefined,
        locationEmissions: undefined,
        excessRECs: undefined,
        excessRECsEmissions: undefined,
        RECs: undefined
      }
      reportOptions.facilities.forEach(facility => {
        if (facility.selected) {
          let selectedFacility: IdbFacility = accountFacilites.find(accountFacility => { return accountFacility.guid == facility.facilityId })
          let facilityMeterSummary: FacilitySummary = this.getFacilitySummary(selectedFacility, true, accountTargetYearBill, reportOptions);
          facilitiesSummary.push(facilityMeterSummary);
        }
      });
      return {
        facilitySummaries: facilitiesSummary,
        totalEnergyUse: _.sumBy(facilitiesSummary, 'energyUsage'),
        totalEnergyCost: _.sumBy(facilitiesSummary, 'energyCost'),
        totalNumberOfMeters: _.sumBy(facilitiesSummary, 'numberOfMeters'),
        totalConsumption: _.sumBy(facilitiesSummary, 'consumption'),
        totalLocationEmissions: undefined,
        totalMarketEmissions: undefined,
        allMetersLastBill: accountTargetYearBill
      };
    }
  }

  getFacilitySummary(facility: IdbFacility, inAccount: boolean, accountMetersLastBill: MonthlyData, reportOptions?: ReportOptions): FacilitySummary {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMetersCopy: Array<IdbUtilityMeter> = JSON.parse(JSON.stringify(accountMeters));
    let facilityMeters: Array<IdbUtilityMeter> = accountMetersCopy.filter(meter => { return meter.facilityId == facility.guid });
    if (reportOptions) {
      let selectedSources: Array<MeterSource> = this.overviewReportService.getSelectedSources(reportOptions);
      facilityMeters = facilityMeters.filter(meter => { return selectedSources.includes(meter.source) });
    }
    if (facilityMeters.length != 0) {
      let facilityLastBill: MonthlyData = this.calanderizationService.getLastBillEntry(facilityMeters, inAccount, reportOptions);
      if (facilityLastBill) {
        let facilityMetersDataSummary: Array<LastYearData> = this.calanderizationService.getPastYearData(facilityMeters, inAccount, accountMetersLastBill, undefined, reportOptions);
        return {
          facility: facility,
          energyUsage: _.sumBy(facilityMetersDataSummary, 'energyUse'),
          energyCost: _.sumBy(facilityMetersDataSummary, 'energyCost'),
          marketEmissions: _.sumBy(facilityMetersDataSummary, 'marketEmissions'),
          locationEmissions: _.sumBy(facilityMetersDataSummary, 'locationEmissions'),
          consumption: _.sumBy(facilityMetersDataSummary, 'energyConsumption'),
          numberOfMeters: facilityMeters.length,
          lastBillDate: new Date(facilityLastBill.year, (facilityLastBill.monthNumValue + 1))
        }
      } else {
        return {
          facility: facility,
          energyUsage: 0,
          energyCost: 0,
          locationEmissions: 0,
          marketEmissions: 0,
          numberOfMeters: facilityMeters.length,
          consumption: 0,
          lastBillDate: undefined
        }
      }
    }
    return {
      facility: facility,
      energyCost: 0,
      energyUsage: 0,
      locationEmissions: 0,
      marketEmissions: 0,
      numberOfMeters: 0,
      consumption: 0,
      lastBillDate: undefined
    }
  }

}

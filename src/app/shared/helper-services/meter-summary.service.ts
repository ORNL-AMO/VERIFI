import { Injectable } from '@angular/core';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { LastYearData, MonthlyData } from 'src/app/models/calanderization';
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
    let allMetersLastBill: MonthlyData = this.calanderizationService.getLastBillEntry(facilityMeters, inAccount, reportOptions)
    if (reportOptions) {
      allMetersLastBill = {
        month: 'Dec',
        monthNumValue: 11,
        year: reportOptions.targetYear,
        energyConsumption: undefined,
        energyUse: undefined,
        energyCost: undefined,
        date: new Date(reportOptions.targetYear, 11),
        emissions: undefined
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
      totalEmissions: _.sumBy(facilityMetersSummary, 'emissions'),
      allMetersLastBill: allMetersLastBill
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
      emissions: _.sumBy(lastYearData, 'emissions'),
      lastBill: lastBill,
      groupName: groupName,
      lastBillDate: lastBillDate
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
        totalEmissions: _.sumBy(facilitiesSummary, 'emissions'),
        allMetersLastBill: accountLastBill
      };
    } else {
      let accountTargetYearBill: MonthlyData = {
        month: 'Dec',
        monthNumValue: 11,
        year: reportOptions.targetYear,
        energyConsumption: undefined,
        energyUse: undefined,
        energyCost: undefined,
        date: new Date(reportOptions.targetYear, 11),
        emissions: undefined
      }
      reportOptions.facilities.forEach(facility => {
        if (facility.selected) {
          let selectedFacility: IdbFacility = accountFacilites.find(accountFacility => {return accountFacility.guid == facility.facilityId})
          let facilityMeterSummary: FacilitySummary = this.getFacilitySummary(selectedFacility, true, accountTargetYearBill, reportOptions);
          facilitiesSummary.push(facilityMeterSummary);
        }
      });
      return {
        facilitySummaries: facilitiesSummary,
        totalEnergyUse: _.sumBy(facilitiesSummary, 'energyUsage'),
        totalEnergyCost: _.sumBy(facilitiesSummary, 'energyCost'),
        totalNumberOfMeters: _.sumBy(facilitiesSummary, 'numberOfMeters'),
        totalEmissions: _.sumBy(facilitiesSummary, 'emissions'),
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
        let facilityMetersDataSummary: Array<{ time: string, energyUse: number, energyCost: number }> = this.calanderizationService.getPastYearData(facilityMeters, inAccount, accountMetersLastBill, undefined, reportOptions);
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

}

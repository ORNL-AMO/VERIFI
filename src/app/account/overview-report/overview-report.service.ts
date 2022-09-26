import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from '../../indexedDB/facility-db.service';
import { UtilityMeterdbService } from '../../indexedDB/utilityMeter-db.service';
import { CalanderizedMeter, MonthlyData } from '../../models/calanderization';
import { IdbAccount, IdbFacility, IdbUtilityMeter, MeterSource } from '../../models/idb';
import { CalanderizationService } from '../../shared/helper-services/calanderization.service';
import * as _ from 'lodash';
import { ReportOptions, ReportUtilitySummary, UtilitySummary } from '../../models/overview-report';
import { AccountdbService } from '../../indexedDB/account-db.service';
import { FirstNaicsList, NAICS, SecondNaicsList, ThirdNaicsList } from 'src/app/shared/form-data/naics-data';

@Injectable({
  providedIn: 'root'
})
export class OverviewReportService {

  reportOptions: BehaviorSubject<ReportOptions>;
  print: BehaviorSubject<boolean>;
  constructor(private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService,
    private calanderizationService: CalanderizationService,
    private accountDbService: AccountdbService) {
    this.reportOptions = new BehaviorSubject<ReportOptions>(undefined);
    this.print = new BehaviorSubject<boolean>(false);
  }

  getInitialReportOptions(reportType: 'data' | 'betterPlants'): ReportOptions {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
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
    });
    let facilities: Array<{ facilityId: string, selected: boolean, name: string }> = new Array();
    accountFacilites.forEach(facility => {
      facilities.push({
        facilityId: facility.guid,
        selected: true,
        name: facility.name
      })
    });

    return {
      title: 'Energy Consumption Report',
      notes: '',
      includeAccount: true,
      accountInfo: true,
      facilitySummaryTable: true,
      accountUtilityTable: true,
      accountFacilityCharts: true,
      includeFacilities: true,
      facilityMetersTable: true,
      facilityUtilityUsageTable: true,
      facilityInfo: true,
      templateId: undefined,
      electricity: electricity,
      naturalGas: naturalGas,
      otherFuels: otherFuels,
      otherEnergy: otherEnergy,
      water: water,
      wasteWater: wasteWater,
      otherUtility: otherUtility,
      facilities: facilities,
      baselineYear: selectedAccount.sustainabilityQuestions.energyReductionBaselineYear,
      targetYear: selectedAccount.sustainabilityQuestions.energyReductionTargetYear,
      annualBarCharts: true,
      monthBarCharts: false,
      energyIsSource: selectedAccount.energyIsSource,
      meterReadings: false,
      reportType: reportType,
      analysisItemId: undefined,
      modificationNotes: '',
      baselineAdjustmentNotes: '',
      includeFacilityNames: true,
    }
  }



  getUtilityUsageData(calanderizedMeters: Array<CalanderizedMeter>, reportOptions: ReportOptions, inAccount: boolean): ReportUtilitySummary {
    let utilitySummaries: Array<UtilitySummary> = new Array();
    let targetYearEnd: Date = new Date(reportOptions.targetYear, 11);
    let targetYearStart: Date = new Date(reportOptions.targetYear, 0);
    let baselineYearEnd: Date = new Date(reportOptions.baselineYear, 11);
    let baselineYearStart: Date = new Date(reportOptions.baselineYear, 0);
    if (reportOptions.electricity) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(calanderizedMeters, targetYearStart, targetYearEnd, baselineYearStart, baselineYearEnd, 'Electricity', inAccount, reportOptions);
      utilitySummaries.push(utilitySummary)
    }
    if (reportOptions.naturalGas) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(calanderizedMeters, targetYearStart, targetYearEnd, baselineYearStart, baselineYearEnd, 'Natural Gas', inAccount, reportOptions);
      utilitySummaries.push(utilitySummary)
    }
    if (reportOptions.otherFuels) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(calanderizedMeters, targetYearStart, targetYearEnd, baselineYearStart, baselineYearEnd, 'Other Fuels', inAccount, reportOptions);
      utilitySummaries.push(utilitySummary)
    }
    if (reportOptions.otherEnergy) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(calanderizedMeters, targetYearStart, targetYearEnd, baselineYearStart, baselineYearEnd, 'Other Energy', inAccount, reportOptions);
      utilitySummaries.push(utilitySummary)
    }
    if (reportOptions.water) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(calanderizedMeters, targetYearStart, targetYearEnd, baselineYearStart, baselineYearEnd, 'Water', inAccount, reportOptions);
      utilitySummaries.push(utilitySummary)
    }
    if (reportOptions.wasteWater) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(calanderizedMeters, targetYearStart, targetYearEnd, baselineYearStart, baselineYearEnd, 'Waste Water', inAccount, reportOptions);
      utilitySummaries.push(utilitySummary)
    }
    if (reportOptions.otherUtility) {
      let utilitySummary: UtilitySummary = this.getUtilitySummary(calanderizedMeters, targetYearStart, targetYearEnd, baselineYearStart, baselineYearEnd, 'Other Utility', inAccount, reportOptions);
      utilitySummaries.push(utilitySummary)
    }
    let consumptionTargetYear: number = _.sumBy(utilitySummaries, (data) => { return this.getSumValue(data.consumptionTargetYear) });
    let costTargetYear: number = _.sumBy(utilitySummaries, (data) => { return this.getSumValue(data.costTargetYear) });
    let marketEmissionsTargetYear: number = _.sumBy(utilitySummaries, (data) => { return this.getSumValue(data.marketEmissionsTargetYear) });
    let locationEmissionsTargetYear: number = _.sumBy(utilitySummaries, (data) => { return this.getSumValue(data.locationEmissionsTargetYear) });
    let consumptionBaselineYear: number = _.sumBy(utilitySummaries, (data) => { return this.getSumValue(data.consumptionBaselineYear) });
    let costBaselineYear: number = _.sumBy(utilitySummaries, (data) => { return this.getSumValue(data.costBaselineYear) });
    let marketEmissionsBaselineYear: number = _.sumBy(utilitySummaries, (data) => { return this.getSumValue(data.marketEmissionsBaselineYear) });
    let locationEmissionsBaselineYear: number = _.sumBy(utilitySummaries, (data) => { return this.getSumValue(data.locationEmissionsBaselineYear) });
    return {
      utilitySummaries: utilitySummaries,
      totals: {
        source: undefined,
        consumptionTargetYear: consumptionTargetYear,
        costTargetYear: costTargetYear,
        marketEmissionsTargetYear: marketEmissionsTargetYear,
        locationEmissionsTargetYear: locationEmissionsTargetYear,
        consumptionBaselineYear: consumptionBaselineYear,
        costBaselineYear: costBaselineYear,
        marketEmissionsBaselineYear: marketEmissionsBaselineYear,
        locationEmissionsBaselineYear: locationEmissionsBaselineYear,
        consumptionChange: consumptionTargetYear - consumptionBaselineYear,
        costChange: costTargetYear - costBaselineYear,
        marketEmissionsChange: marketEmissionsTargetYear - marketEmissionsBaselineYear,
        locationEmissionsChange: locationEmissionsTargetYear - locationEmissionsBaselineYear
      },
      targetYearStart: targetYearStart,
      targetYearEnd: targetYearEnd,
      baselineYearStart: baselineYearStart,
      baselineYearEnd: baselineYearEnd
    }
  }

  getSumValue(val: number): number {
    if (isNaN(val) == false) {
      return val;
    } else {
      return 0;
    }
  }

  getUtilitySummary(calanderizedMeterData: Array<CalanderizedMeter>, targetYearStart: Date, targetYearEnd: Date, baselineYearStart: Date, baselineYearEnd: Date, source: MeterSource, inAccount: boolean, reportOptions: ReportOptions): UtilitySummary {
    let sourceMeters: Array<CalanderizedMeter> = calanderizedMeterData.filter(cMeter => { return cMeter.meter.source == source });
    // let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(sourceMeters, inAccount, undefined, reportOptions);
    let monthlyData: Array<MonthlyData> = sourceMeters.flatMap(data => { return data.monthlyData });
    let targetYearData: Array<MonthlyData> = monthlyData.filter(data => {
      let dataDate: Date = new Date(data.date);
      return this.isDateWithinRange(dataDate, targetYearStart, targetYearEnd);
    });
    let baselineYearData: Array<MonthlyData> = monthlyData.filter(data => {
      let dataDate: Date = new Date(data.date);
      return this.isDateWithinRange(dataDate, baselineYearStart, baselineYearEnd);
    });
    //divide emissions by /1000 for tonne
    let consumptionTargetYear: number = _.sumBy(targetYearData, (data) => { return this.getSumValue(data.energyUse) });
    let costTargetYear: number = _.sumBy(targetYearData, (data) => { return this.getSumValue(data.energyCost) });
    let marketEmissionsTargetYear: number = _.sumBy(targetYearData, (data) => { return this.getSumValue(data.marketEmissions) }) / 1000;
    let locationEmissionsTargetYear: number = _.sumBy(targetYearData, (data) => { return this.getSumValue(data.locationEmissions) }) / 1000;
    let consumptionBaselineYear: number = _.sumBy(baselineYearData, (data) => { return this.getSumValue(data.energyUse) });
    let costBaselineYear: number = _.sumBy(baselineYearData, (data) => { return this.getSumValue(data.energyCost) });
    let marketEmissionsBaselineYear: number = _.sumBy(baselineYearData, (data) => { return this.getSumValue(data.marketEmissions) }) / 1000;
    let locationEmissionsBaselineYear: number = _.sumBy(baselineYearData, (data) => { return this.getSumValue(data.locationEmissions) }) / 1000;
    return {
      source: source,
      consumptionTargetYear: consumptionTargetYear,
      costTargetYear: costTargetYear,
      marketEmissionsTargetYear: marketEmissionsTargetYear,
      locationEmissionsTargetYear: locationEmissionsTargetYear,
      consumptionBaselineYear: consumptionBaselineYear,
      costBaselineYear: costBaselineYear,
      marketEmissionsBaselineYear: marketEmissionsBaselineYear,
      locationEmissionsBaselineYear: locationEmissionsBaselineYear,
      consumptionChange: consumptionTargetYear - consumptionBaselineYear,
      costChange: costTargetYear - costBaselineYear,
      marketEmissionsChange: marketEmissionsTargetYear - marketEmissionsBaselineYear,
      locationEmissionsChange: locationEmissionsTargetYear - locationEmissionsBaselineYear
    }
  }

  isDateWithinRange(dataDate: Date, startDate: Date, endDate: Date): boolean {
    if (dataDate >= startDate && dataDate <= endDate) {
      return true;
    } else {
      return false;
    }
  }

  getSelectedSources(reportOptions: ReportOptions): Array<MeterSource> {
    let sources: Array<MeterSource> = new Array();
    if (reportOptions.electricity) {
      sources.push('Electricity');
    }
    if (reportOptions.naturalGas) {
      sources.push('Natural Gas');
    }
    if (reportOptions.otherFuels) {
      sources.push('Other Fuels');
    }
    if (reportOptions.otherEnergy) {
      sources.push('Other Energy');
    }
    if (reportOptions.water) {
      sources.push('Water');
    }
    if (reportOptions.wasteWater) {
      sources.push('Waste Water');
    }
    if (reportOptions.otherUtility) {
      sources.push('Other Utility');
    }
    return sources;
  }


  getNAICS(accountOrFacility: IdbAccount | IdbFacility): string {
    let matchingNAICS: NAICS;
    if (accountOrFacility.naics3) {
      matchingNAICS = ThirdNaicsList.find(item => { return item.code == accountOrFacility.naics3 });
    } else if (accountOrFacility.naics2) {
      matchingNAICS = SecondNaicsList.find(item => { return item.code == accountOrFacility.naics2 });
    } else if (accountOrFacility.naics1) {
      matchingNAICS = FirstNaicsList.find(item => { return item.code == accountOrFacility.naics1 });
    }

    if (matchingNAICS) {
      return matchingNAICS.code + ' - ' + matchingNAICS.industryType;
    }
    return;
  }

}


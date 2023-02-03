import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AccountFacilitiesSummary, FacilityMeterSummaryData, UtilityUsageSummaryData, YearMonthData } from 'src/app/models/dashboard';
import { AllSources, EnergySources, IdbAccount, IdbAccountReport, IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup, MeterSource, WaterSources } from 'src/app/models/idb';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { AccountReportsService } from '../account-reports.service';
import { Subscription } from 'rxjs';
import { FacilitySummaryClass } from 'src/app/calculations/dashboard-calculations/facilitySummaryClass';
import { AccountSummaryClass } from 'src/app/calculations/dashboard-calculations/accountSummaryClass';

@Component({
  selector: 'app-data-overview-report',
  templateUrl: './data-overview-report.component.html',
  styleUrls: ['./data-overview-report.component.css']
})
export class DataOverviewReportComponent {

  overviewReport: DataOverviewReportSetup;
  print: boolean = false;
  printSub: Subscription;
  account: IdbAccount;

  facilitiesWorker: any;
  facilitiesData: Array<DataOverviewFacility>;

  accountWorker: any;
  accountData: DataOverviewAccount;


  includedFacilities: Array<string>;
  facilityIndex: number;

  calculatingFacilities: boolean = true;
  calculatingAccounts: boolean = true;


  constructor(private accountReportDbService: AccountReportDbService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private calanderizationService: CalanderizationService,
    private utilityMeterDbService: UtilityMeterdbService,
    private accountReportsService: AccountReportsService) {

  }

  ngOnInit() {
    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
    });
    this.account = this.accountDbService.selectedAccount.getValue();
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    this.overviewReport = selectedReport.dataOverviewReportSetup;
    this.includedFacilities = new Array();
    this.overviewReport.includedFacilities.forEach(facility => {
      if (facility.included) {
        this.includedFacilities.push(facility.facilityId);
      }
    });
    if (this.overviewReport.includeAccountReport) {
      this.calculateAccountSummary();
    } else {
      this.calculatingAccounts = false;
    }

    if (this.overviewReport.includeFacilityReports) {
      this.facilitiesData = new Array();
      if (this.includedFacilities.length > 0) {
        let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
        let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
        this.calculateFacilitiesSummary(0, accountFacilities, accountMeterGroups);
      } else {
        this.calculatingFacilities = false;
      }
    } else {
      this.calculatingFacilities = false;
    }
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
  }

  calculateFacilitiesSummary(facilityIndex: number, accountFacilities: Array<IdbFacility>, accountMeterGroups: Array<IdbUtilityMeterGroup>) {
    let facilityId: string = this.includedFacilities[facilityIndex];
    let facility: IdbFacility = accountFacilities.find(facility => { return facility.guid == facilityId });
    let facilityGroups: Array<IdbUtilityMeterGroup> = accountMeterGroups.filter(group => { return group.facilityId == facilityId });
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == facilityId });
    let dataOverviewFacility: DataOverviewFacility = this.initDataOverviewFacility(facility);

    dataOverviewFacility.calanderizedMeters = this.calanderizationService.getCalanderizedMeterData(facilityMeters, false, true, { energyIsSource: this.overviewReport.energyIsSource });
    if (typeof Worker !== 'undefined') {
      this.facilitiesWorker = new Worker(new URL('src/app/web-workers/facility-overview.worker', import.meta.url));
      this.facilitiesWorker.onmessage = ({ data }) => {
        if (data.type == 'energy') {
          dataOverviewFacility.energyMeterSummaryData = data.meterSummaryData;
          dataOverviewFacility.energyMonthlySourceData = data.monthlySourceData;
          dataOverviewFacility.energyUtilityUsageSummaryData = data.utilityUsageSummaryData;
          dataOverviewFacility.energyYearMonthData = data.yearMonthData;
        } else if (data.type == 'water') {
          dataOverviewFacility.waterMeterSummaryData = data.meterSummaryData;
          dataOverviewFacility.waterMonthlySourceData = data.monthlySourceData;
          dataOverviewFacility.waterUtilityUsageSummaryData = data.utilityUsageSummaryData;
          dataOverviewFacility.waterYearMonthData = data.yearMonthData;
        } else if (data.type == 'all') {
          dataOverviewFacility.costsMeterSummaryData = data.meterSummaryData;
          dataOverviewFacility.costsMonthlySourceData = data.monthlySourceData;
          dataOverviewFacility.costsUtilityUsageSummaryData = data.utilityUsageSummaryData;
          dataOverviewFacility.costsYearMonthData = data.yearMonthData;
          // this.calculating = false;
          this.facilitiesWorker.terminate();
          this.facilitiesData.push(dataOverviewFacility);
          if (facilityIndex != this.includedFacilities.length - 1) {
            this.calculateFacilitiesSummary(facilityIndex + 1, accountFacilities, accountMeterGroups);
          } else {
            // this.accountReportsService.calculatingFacilities.next(false);
            this.calculatingFacilities = false;
          }
        }
      };
      let energySources: Array<MeterSource> = EnergySources;
      this.facilitiesWorker.postMessage({
        calanderizedMeters: dataOverviewFacility.calanderizedMeters,
        groups: facilityGroups,
        sources: energySources,
        type: 'energy',
        facility: facility
      });

      let waterSources: Array<MeterSource> = WaterSources;
      this.facilitiesWorker.postMessage({
        calanderizedMeters: dataOverviewFacility.calanderizedMeters,
        groups: facilityGroups,
        sources: waterSources,
        type: 'water',
        facility: facility
      });

      let allSources: Array<MeterSource> = AllSources;
      this.facilitiesWorker.postMessage({
        calanderizedMeters: dataOverviewFacility.calanderizedMeters,
        groups: facilityGroups,
        sources: allSources,
        type: 'all',
        facility: facility
      });
    } else {
      // Web Workers are not supported in this environment.
      let energySources: Array<MeterSource> = EnergySources;
      let facilitySummaryClass: FacilitySummaryClass = new FacilitySummaryClass(dataOverviewFacility.calanderizedMeters, facilityGroups, energySources, facility);
      dataOverviewFacility.energyMeterSummaryData = facilitySummaryClass.meterSummaryData;
      dataOverviewFacility.energyMonthlySourceData = facilitySummaryClass.monthlySourceData;
      dataOverviewFacility.energyUtilityUsageSummaryData = facilitySummaryClass.utilityUsageSummaryData;
      dataOverviewFacility.energyYearMonthData = facilitySummaryClass.yearMonthData;

      let waterSources: Array<MeterSource> = WaterSources;
      let waterSummaryClass: FacilitySummaryClass = new FacilitySummaryClass(dataOverviewFacility.calanderizedMeters, facilityGroups, waterSources, facility);
      dataOverviewFacility.waterMeterSummaryData = waterSummaryClass.meterSummaryData;
      dataOverviewFacility.waterMonthlySourceData = waterSummaryClass.monthlySourceData;
      dataOverviewFacility.waterUtilityUsageSummaryData = waterSummaryClass.utilityUsageSummaryData;
      dataOverviewFacility.waterYearMonthData = waterSummaryClass.yearMonthData;

      let allSources: Array<MeterSource> = AllSources;
      let allSourcesSummaryClass: FacilitySummaryClass = new FacilitySummaryClass(dataOverviewFacility.calanderizedMeters, facilityGroups, allSources, facility);
      dataOverviewFacility.costsMeterSummaryData = allSourcesSummaryClass.meterSummaryData;
      dataOverviewFacility.costsMonthlySourceData = allSourcesSummaryClass.monthlySourceData;
      dataOverviewFacility.costsUtilityUsageSummaryData = allSourcesSummaryClass.utilityUsageSummaryData;
      dataOverviewFacility.costsYearMonthData = allSourcesSummaryClass.yearMonthData;
      this.facilitiesData.push(dataOverviewFacility);
      if (facilityIndex != this.includedFacilities.length - 1) {
        this.calculateFacilitiesSummary(facilityIndex + 1, accountFacilities, accountMeterGroups);
      } else {
        // this.accountReportsService.calculatingFacilities.next(false);
        this.calculatingFacilities = false;
      }
    }
  }

  calculateAccountSummary() {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let includedFacilities: Array<IdbFacility> = facilities.filter(facility => {
      return this.includedFacilities.includes(facility.guid);
    });

    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let includedMeters: Array<IdbUtilityMeter> = meters.filter(meter => {
      return this.includedFacilities.includes(meter.facilityId);
    });
    this.accountData = this.initDataOverviewAccount(this.account);
    this.accountData.calanderizedMeters = this.calanderizationService.getCalanderizedMeterData(includedMeters, true, true, { energyIsSource: this.overviewReport.energyIsSource });
    if (typeof Worker !== 'undefined') {
      this.accountWorker = new Worker(new URL('src/app/web-workers/account-overview.worker', import.meta.url));
      this.accountWorker.onmessage = ({ data }) => {
        if (data.type == 'energy') {
          this.accountData.accountFacilitiesEnergySummary = data.accountFacilitiesSummary;
          this.accountData.energyUtilityUsageSummaryData = data.utilityUsageSummaryData;
          this.accountData.energyYearMonthData = data.yearMonthData;
        } else if (data.type == 'water') {
          this.accountData.accountFacilitiesWaterSummary = data.accountFacilitiesSummary;
          this.accountData.waterUtilityUsageSummaryData = data.utilityUsageSummaryData;
          this.accountData.waterYearMonthData = data.yearMonthData;
        } else if (data.type == 'all') {
          this.accountData.accountFacilitiesCostsSummary = data.accountFacilitiesSummary;
          this.accountData.costsUtilityUsageSummaryData = data.utilityUsageSummaryData;
          this.accountData.costsYearMonthData = data.yearMonthData;
          this.calculatingAccounts = false;
          this.accountWorker.terminate();
        }
      };

      let energySources: Array<MeterSource> = EnergySources;
      this.accountWorker.postMessage({
        calanderizedMeters: this.accountData.calanderizedMeters,
        facilities: includedFacilities,
        sources: energySources,
        type: 'energy',
        account: this.account
      });

      let waterSources: Array<MeterSource> = WaterSources;
      this.accountWorker.postMessage({
        calanderizedMeters: this.accountData.calanderizedMeters,
        facilities: includedFacilities,
        sources: waterSources,
        type: 'water',
        account: this.account
      });

      let allSources: Array<MeterSource> = AllSources;
      this.accountWorker.postMessage({
        calanderizedMeters: this.accountData.calanderizedMeters,
        facilities: includedFacilities,
        sources: allSources,
        type: 'all',
        account: this.account
      });
    } else {
      // Web Workers are not supported in this environment.
      let energySources: Array<MeterSource> = EnergySources;
      let energySummaryClass: AccountSummaryClass = new AccountSummaryClass(this.accountData.calanderizedMeters, facilities, energySources, this.account);
      this.accountData.accountFacilitiesEnergySummary = energySummaryClass.facilitiesSummary;
      this.accountData.energyUtilityUsageSummaryData = energySummaryClass.utilityUsageSummaryData;
      this.accountData.energyYearMonthData = energySummaryClass.yearMonthData;
      let waterSources: Array<MeterSource> = WaterSources;
      let waterSummaryClass: AccountSummaryClass = new AccountSummaryClass(this.accountData.calanderizedMeters, facilities, waterSources, this.account);
      this.accountData.accountFacilitiesWaterSummary = waterSummaryClass.facilitiesSummary;
      this.accountData.waterUtilityUsageSummaryData = waterSummaryClass.utilityUsageSummaryData;
      this.accountData.waterYearMonthData = waterSummaryClass.yearMonthData;
      let allSources: Array<MeterSource> = AllSources;
      let allSummaryClass: AccountSummaryClass = new AccountSummaryClass(this.accountData.calanderizedMeters, facilities, allSources, this.account);
      this.accountData.accountFacilitiesCostsSummary = allSummaryClass.facilitiesSummary;
      this.accountData.costsUtilityUsageSummaryData = allSummaryClass.utilityUsageSummaryData;
      this.accountData.costsYearMonthData = allSummaryClass.yearMonthData;
      this.calculatingAccounts = false;
    }
  }



  initDataOverviewFacility(facility: IdbFacility): DataOverviewFacility {
    return {
      facility: facility,
      calanderizedMeters: undefined,
      energyMeterSummaryData: undefined,
      energyMonthlySourceData: undefined,
      energyUtilityUsageSummaryData: undefined,
      energyYearMonthData: undefined,

      costsMeterSummaryData: undefined,
      costsMonthlySourceData: undefined,
      costsUtilityUsageSummaryData: undefined,
      costsYearMonthData: undefined,

      waterMeterSummaryData: undefined,
      waterMonthlySourceData: undefined,
      waterUtilityUsageSummaryData: undefined,
      waterYearMonthData: undefined
    }
  }

  initDataOverviewAccount(account: IdbAccount): DataOverviewAccount {
    return {
      account: account,
      calanderizedMeters: undefined,

      accountFacilitiesEnergySummary: undefined,
      energyUtilityUsageSummaryData: undefined,
      energyYearMonthData: undefined,

      accountFacilitiesCostsSummary: undefined,
      costsUtilityUsageSummaryData: undefined,
      costsYearMonthData: undefined,

      accountFacilitiesWaterSummary: undefined,
      waterUtilityUsageSummaryData: undefined,
      waterYearMonthData: undefined,
    }
  }

}


export interface DataOverviewFacility {
  facility: IdbFacility,
  calanderizedMeters: Array<CalanderizedMeter>;
  energyMeterSummaryData: FacilityMeterSummaryData;
  energyMonthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>;
  energyUtilityUsageSummaryData: UtilityUsageSummaryData;
  energyYearMonthData: Array<YearMonthData>;


  costsMeterSummaryData: FacilityMeterSummaryData;
  costsMonthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>;
  costsUtilityUsageSummaryData: UtilityUsageSummaryData;
  costsYearMonthData: Array<YearMonthData>;

  waterMeterSummaryData: FacilityMeterSummaryData;
  waterMonthlySourceData: Array<{
    source: MeterSource,
    data: Array<FacilityBarChartData>
  }>;
  waterUtilityUsageSummaryData: UtilityUsageSummaryData;
  waterYearMonthData: Array<YearMonthData>;
}

export interface DataOverviewAccount {
  account: IdbAccount;
  calanderizedMeters: Array<CalanderizedMeter>;


  accountFacilitiesEnergySummary: AccountFacilitiesSummary;
  energyUtilityUsageSummaryData: UtilityUsageSummaryData;
  energyYearMonthData: Array<YearMonthData>;

  accountFacilitiesCostsSummary: AccountFacilitiesSummary;
  costsUtilityUsageSummaryData: UtilityUsageSummaryData;
  costsYearMonthData: Array<YearMonthData>;

  accountFacilitiesWaterSummary: AccountFacilitiesSummary;
  waterUtilityUsageSummaryData: UtilityUsageSummaryData;
  waterYearMonthData: Array<YearMonthData>;
}
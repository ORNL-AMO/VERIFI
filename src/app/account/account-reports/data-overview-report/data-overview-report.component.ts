import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { FacilityMeterSummaryData, UtilityUsageSummaryData, YearMonthData } from 'src/app/models/dashboard';
import { AllSources, EnergySources, IdbAccount, IdbAccountReport, IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup, MeterSource, WaterSources } from 'src/app/models/idb';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { AccountReportsService } from '../account-reports.service';
import { Subscription } from 'rxjs';
import { FacilitySummaryClass } from 'src/app/calculations/dashboard-calculations/facilitySummaryClass';
import { AccountOverviewData, UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';

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
      this.calculateAccountSummary(selectedReport);
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
          this.facilitiesWorker.terminate();
          this.facilitiesData.push(dataOverviewFacility);
          if (facilityIndex != this.includedFacilities.length - 1) {
            this.calculateFacilitiesSummary(facilityIndex + 1, accountFacilities, accountMeterGroups);
          } else {
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
        this.calculatingFacilities = false;
      }
    }
  }

  calculateAccountSummary(selectedReport: IdbAccountReport) {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let includedFacilities: Array<IdbFacility> = facilities.filter(facility => {
      return this.includedFacilities.includes(facility.guid);
    });

    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let includedMeters: Array<IdbUtilityMeter> = meters.filter(meter => {
      return this.includedFacilities.includes(meter.facilityId);
    });

    let startDate: Date = new Date(selectedReport.startYear, selectedReport.startMonth, 1);
    let endDate: Date = new Date(selectedReport.endYear, selectedReport.endMonth, 1);


    this.accountData = this.initDataOverviewAccount(this.account, startDate, endDate);
    this.accountData.calanderizedMeters = this.calanderizationService.getCalanderizedMeterData(includedMeters, true, true, { energyIsSource: this.overviewReport.energyIsSource });

    if (typeof Worker !== 'undefined') {
      this.accountWorker = new Worker(new URL('src/app/web-workers/account-overview.worker', import.meta.url));
      this.accountWorker.onmessage = ({ data }) => {
        this.accountData.accountOverviewData = data.accountOverviewData;
        this.accountData.utilityUseAndCost = data.utilityUseAndCost;
        console.log(this.accountData);
        this.calculatingAccounts = false;
        this.accountWorker.terminate();
      };

      this.accountWorker.postMessage({
        calanderizedMeters: this.accountData.calanderizedMeters,
        facilities: includedFacilities,
        type: 'overview',
        dateRange: this.accountData.dateRange
      });
    } else {
      // Web Workers are not supported in this environment.
      this.accountData.accountOverviewData = new AccountOverviewData(this.accountData.calanderizedMeters, facilities, this.account, this.accountData.dateRange);
      this.accountData.utilityUseAndCost = new UtilityUseAndCost(this.accountData.calanderizedMeters, this.accountData.dateRange);
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

  initDataOverviewAccount(account: IdbAccount, startDate: Date, endDate: Date): DataOverviewAccount {
    return {
      account: account,
      calanderizedMeters: undefined,
      dateRange: {
        startDate: startDate,
        endDate: endDate
      },
      accountOverviewData: undefined,
      utilityUseAndCost: undefined
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
  dateRange: {
    startDate: Date,
    endDate: Date
  };
  accountOverviewData: AccountOverviewData;
  utilityUseAndCost: UtilityUseAndCost;
}
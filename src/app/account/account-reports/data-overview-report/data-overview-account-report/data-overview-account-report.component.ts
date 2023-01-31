import { Component, Input } from '@angular/core';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { AccountSummaryClass } from 'src/app/calculations/dashboard-calculations/accountSummaryClass';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AccountFacilitiesSummary, UtilityUsageSummaryData, YearMonthData } from 'src/app/models/dashboard';
import { IdbAccount, IdbFacility, IdbUtilityMeter, MeterSource } from 'src/app/models/idb';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-data-overview-account-report',
  templateUrl: './data-overview-account-report.component.html',
  styleUrls: ['./data-overview-account-report.component.css']
})
export class DataOverviewAccountReportComponent {
  @Input()
  overviewReport: DataOverviewReportSetup;

  calculating: boolean = true;
  account: IdbAccount;
  worker: any;
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



  constructor(
    private accountOverviewService: AccountOverviewService,
    private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService,
    private calanderizationService: CalanderizationService,
    private utilityMeterDbService: UtilityMeterdbService) {
  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    this.accountOverviewService.emissionsDisplay.next(this.overviewReport.emissionsDisplay);
    this.calanderizedMeters = this.calanderizationService.getCalanderizedMeterData(meters, true, true, { energyIsSource: this.overviewReport.energyIsSource });
    this.calculateFacilitiesSummary();
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
    }
  }


  calculateFacilitiesSummary() {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/account-overview.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (data.type == 'energy') {
          this.accountFacilitiesEnergySummary = data.accountFacilitiesSummary;
          this.energyUtilityUsageSummaryData = data.utilityUsageSummaryData;
          this.energyYearMonthData = data.yearMonthData;
        } else if (data.type == 'water') {
          this.accountFacilitiesWaterSummary = data.accountFacilitiesSummary;
          this.waterUtilityUsageSummaryData = data.utilityUsageSummaryData;
          this.waterYearMonthData = data.yearMonthData;
        } else if (data.type == 'all') {
          this.accountFacilitiesCostsSummary = data.accountFacilitiesSummary;
          this.costsUtilityUsageSummaryData = data.utilityUsageSummaryData;
          this.costsYearMonthData = data.yearMonthData;
          this.calculating = false;
          this.worker.terminate();
        }
      };

      let energySources: Array<MeterSource> = ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy']
      this.worker.postMessage({
        calanderizedMeters: this.calanderizedMeters,
        facilities: facilities,
        sources: energySources,
        type: 'energy',
        account: this.account
      });

      let waterSources: Array<MeterSource> = [
        "Water",
        "Waste Water"
      ];
      this.worker.postMessage({
        calanderizedMeters: this.calanderizedMeters,
        facilities: facilities,
        sources: waterSources,
        type: 'water',
        account: this.account
      });

      let allSources: Array<MeterSource> = [
        "Electricity",
        "Natural Gas",
        "Other Fuels",
        "Other Energy",
        "Water",
        "Waste Water",
        "Other Utility"
      ]
      this.worker.postMessage({
        calanderizedMeters: this.calanderizedMeters,
        facilities: facilities,
        sources: allSources,
        type: 'all',
        account: this.account
      });
    } else {
      // Web Workers are not supported in this environment.
      let energySources: Array<MeterSource> = ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy']
      let energySummaryClass: AccountSummaryClass = new AccountSummaryClass(this.calanderizedMeters, facilities, energySources, this.account);
      this.accountFacilitiesEnergySummary = energySummaryClass.facilitiesSummary;
      this.energyUtilityUsageSummaryData = energySummaryClass.utilityUsageSummaryData;
      this.energyYearMonthData = energySummaryClass.yearMonthData;
      let waterSources: Array<MeterSource> = [
        "Water",
        "Waste Water"
      ];
      let waterSummaryClass: AccountSummaryClass = new AccountSummaryClass(this.calanderizedMeters, facilities, waterSources, this.account);
      this.accountFacilitiesWaterSummary = waterSummaryClass.facilitiesSummary;
      this.waterUtilityUsageSummaryData = waterSummaryClass.utilityUsageSummaryData;
      this.waterYearMonthData = waterSummaryClass.yearMonthData;
      let allSources: Array<MeterSource> = [
        "Electricity",
        "Natural Gas",
        "Other Fuels",
        "Other Energy",
        "Water",
        "Waste Water",
        "Other Utility"
      ]
      let allSummaryClass: AccountSummaryClass = new AccountSummaryClass(this.calanderizedMeters, facilities, allSources, this.account);
      this.accountFacilitiesCostsSummary = allSummaryClass.facilitiesSummary;
      this.costsUtilityUsageSummaryData = allSummaryClass.utilityUsageSummaryData;
      this.costsYearMonthData = allSummaryClass.yearMonthData;
      this.calculating = false;
    }
  }
}

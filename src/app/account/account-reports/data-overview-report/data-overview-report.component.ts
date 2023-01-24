import { Component } from '@angular/core';
import { AccountSummaryClass } from 'src/app/calculations/dashboard-calculations/accountSummaryClass';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountReport, IdbFacility, IdbUtilityMeter, MeterSource } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { AccountOverviewService } from '../../account-overview/account-overview.service';

@Component({
  selector: 'app-data-overview-report',
  templateUrl: './data-overview-report.component.html',
  styleUrls: ['./data-overview-report.component.css']
})
export class DataOverviewReportComponent {

  calculating: boolean = true;
  selectedReport: IdbAccountReport;
  print: boolean = false;
  worker: any;
  account: IdbAccount;
  // calanderizedMeters: Array<CalanderizedMeter>;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountOverviewService: AccountOverviewService,
    private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService,
    private calanderizationService: CalanderizationService,
    private utilityMeterDbService: UtilityMeterdbService) {

  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    this.accountOverviewService.calanderizedMeters = this.calanderizationService.getCalanderizedMeterData(meters, true, true, { energyIsSource: this.selectedReport.dataOverviewReportSetup.energyIsSource });
    this.calculateFacilitiesSummary();
  }

  calculateFacilitiesSummary() {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/account-overview.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        if (data.type == 'energy') {
          this.accountOverviewService.accountFacilitiesEnergySummary.next(data.accountFacilitiesSummary);
          this.accountOverviewService.energyUtilityUsageSummaryData.next(data.utilityUsageSummaryData);
          this.accountOverviewService.energyYearMonthData.next(data.yearMonthData);
          // this.accountOverviewService.calculatingEnergy.next(false);
        } else if (data.type == 'water') {
          this.accountOverviewService.accountFacilitiesWaterSummary.next(data.accountFacilitiesSummary);
          this.accountOverviewService.waterUtilityUsageSummaryData.next(data.utilityUsageSummaryData);
          this.accountOverviewService.waterYearMonthData.next(data.yearMonthData);
          // this.accountOverviewService.calculatingWater.next(false);
        } else if (data.type == 'all') {
          this.accountOverviewService.accountFacilitiesCostsSummary.next(data.accountFacilitiesSummary);
          this.accountOverviewService.costsUtilityUsageSummaryData.next(data.utilityUsageSummaryData);
          this.accountOverviewService.costsYearMonthData.next(data.yearMonthData);
          // this.accountOverviewService.calculatingCosts.next(false);
          this.calculating = false;
          this.worker.terminate();
        }
      };
      // this.accountOverviewService.calculatingEnergy.next(true);
      // this.accountOverviewService.calculatingWater.next(true);
      // this.accountOverviewService.calculatingCosts.next(true);

      let energySources: Array<MeterSource> = ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy']
      this.worker.postMessage({
        calanderizedMeters: this.accountOverviewService.calanderizedMeters,
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
        calanderizedMeters: this.accountOverviewService.calanderizedMeters,
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
        calanderizedMeters: this.accountOverviewService.calanderizedMeters,
        facilities: facilities,
        sources: allSources,
        type: 'all',
        account: this.account
      });
    } else {
      // Web Workers are not supported in this environment.
      let energySources: Array<MeterSource> = ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy']
      let energySummaryClass: AccountSummaryClass = new AccountSummaryClass(this.accountOverviewService.calanderizedMeters, facilities, energySources, this.account);
      this.accountOverviewService.accountFacilitiesEnergySummary.next(energySummaryClass.facilitiesSummary);
      this.accountOverviewService.energyUtilityUsageSummaryData.next(energySummaryClass.utilityUsageSummaryData);
      this.accountOverviewService.energyYearMonthData.next(energySummaryClass.yearMonthData);
      let waterSources: Array<MeterSource> = [
        "Water",
        "Waste Water"
      ];
      let waterSummaryClass: AccountSummaryClass = new AccountSummaryClass(this.accountOverviewService.calanderizedMeters, facilities, waterSources, this.account);
      this.accountOverviewService.accountFacilitiesWaterSummary.next(waterSummaryClass.facilitiesSummary);
      this.accountOverviewService.waterUtilityUsageSummaryData.next(waterSummaryClass.utilityUsageSummaryData);
      this.accountOverviewService.waterYearMonthData.next(waterSummaryClass.yearMonthData);
      let allSources: Array<MeterSource> = [
        "Electricity",
        "Natural Gas",
        "Other Fuels",
        "Other Energy",
        "Water",
        "Waste Water",
        "Other Utility"
      ]
      let allSummaryClass: AccountSummaryClass = new AccountSummaryClass(this.accountOverviewService.calanderizedMeters, facilities, allSources, this.account);
      this.accountOverviewService.accountFacilitiesCostsSummary.next(allSummaryClass.facilitiesSummary);
      this.accountOverviewService.costsUtilityUsageSummaryData.next(allSummaryClass.utilityUsageSummaryData);
      this.accountOverviewService.costsYearMonthData.next(allSummaryClass.yearMonthData);
      this.calculating = false;
    }
  }


}

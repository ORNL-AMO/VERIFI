import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { MeterSummaryService } from 'src/app/shared/helper-services/meter-summary.service';
import { OverviewReportService, ReportOptions, ReportUtilityOptions, ReportUtilitySummary } from '../overview-report.service';

@Component({
  selector: 'app-account-report',
  templateUrl: './account-report.component.html',
  styleUrls: ['./account-report.component.css']
})
export class AccountReportComponent implements OnInit {

  account: IdbAccount;
  accountSub: Subscription;
  reportOptions: ReportOptions;
  reportOptionsSub: Subscription;
  reportUtilityOptionsSub: Subscription;
  reportUtilityOptions: ReportUtilityOptions;
  accountFacilitiesSummary: AccountFacilitiesSummary = {
    facilitySummaries: [],
    totalEnergyUse: undefined,
    totalEnergyCost: undefined,
    totalNumberOfMeters: undefined,
    totalEmissions: undefined,
    allMetersLastBill: undefined
  };
  accountReportUtilitySummary: ReportUtilitySummary;
  facilitiesUtilitySummaries: Array<{
    utilitySummary: ReportUtilitySummary,
    facility: IdbFacility
  }>;

  constructor(private accountDbService: AccountdbService, private overviewReportService: OverviewReportService,
    private meterSummaryService: MeterSummaryService, private utilityMeterDbService: UtilityMeterdbService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.account = account
      this.setAccountFacilities();
    });

    this.reportOptionsSub = this.overviewReportService.reportOptions.subscribe(reportOptions => {
      this.reportOptions = reportOptions;
    });

    this.reportUtilityOptionsSub = this.overviewReportService.reportUtilityOptions.subscribe(reportUtilityOptions => {
      this.reportUtilityOptions = reportUtilityOptions
      this.setFacilitySummary();
      this.setFacilitiesUtilitySummaries();
    });
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.reportOptionsSub.unsubscribe();
    this.reportUtilityOptionsSub.unsubscribe();
  }

  setAccountFacilities() {
    this.accountFacilitiesSummary = this.meterSummaryService.getAccountFacilitesSummary();
  }

  setFacilitySummary() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    this.accountReportUtilitySummary = this.overviewReportService.getUtilityUsageData(accountMeters, this.reportUtilityOptions, true);
  }

  setFacilitiesUtilitySummaries() {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.facilitiesUtilitySummaries = new Array();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    facilities.forEach(facility => {
      let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == facility.id });
      let utilitySummary: ReportUtilitySummary = this.overviewReportService.getUtilityUsageData(facilityMeters, this.reportUtilityOptions, true);
      this.facilitiesUtilitySummaries.push({
        facility: facility,
        utilitySummary: utilitySummary
      })
    })
  }
}

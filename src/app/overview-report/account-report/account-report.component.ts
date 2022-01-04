import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { FacilityBarChartData } from 'src/app/models/visualization';
import { MeterSummaryService } from 'src/app/shared/helper-services/meter-summary.service';
import { VisualizationService } from 'src/app/shared/helper-services/visualization.service';
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
  lastMonthsDate: string;
  yearPriorDate: string;
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
    this.setDates();
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

  setDates(){
    let date1: Date = new Date(this.accountFacilitiesSummary.allMetersLastBill.year, this.accountFacilitiesSummary.allMetersLastBill.monthNumValue);
    let date1Month: string = date1.toLocaleDateString("en-US", { month: 'short' });
    let date1Year: string = date1.toLocaleDateString("en-US", { year: "numeric" })
    this.lastMonthsDate = date1Month + ', ' + date1Year;
    let date2: Date = new Date(this.accountFacilitiesSummary.allMetersLastBill.year - 1, this.accountFacilitiesSummary.allMetersLastBill.monthNumValue);
    let date2Month: string = date2.toLocaleDateString("en-US", { month: 'short' });
    let date2Year: string = date2.toLocaleDateString("en-US", { year: "numeric" })
    this.yearPriorDate = date2Month + ', ' + date2Year;
  }
}

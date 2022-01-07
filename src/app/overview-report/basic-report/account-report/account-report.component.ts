import { Component, Input, OnInit } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { ReportOptions, ReportUtilityOptions, ReportUtilitySummary } from 'src/app/models/overview-report';
import { MeterSummaryService } from 'src/app/shared/helper-services/meter-summary.service';
import { OverviewReportService } from '../../overview-report.service';

@Component({
  selector: 'app-account-report',
  templateUrl: './account-report.component.html',
  styleUrls: ['./account-report.component.css']
})
export class AccountReportComponent implements OnInit {
  @Input()
  account: IdbAccount;
  @Input()
  reportOptions: ReportOptions;
  @Input()
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
  constructor(private overviewReportService: OverviewReportService,
    private meterSummaryService: MeterSummaryService, private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.setFacilitySummary();
    this.setFacilitiesUtilitySummaries();
    this.setAccountFacilities();
  }


  setAccountFacilities() {
    this.accountFacilitiesSummary = this.meterSummaryService.getAccountFacilitesSummary(this.reportUtilityOptions);
  }

  setFacilitySummary() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let removeFacilityId: Array<number> = new Array();
    this.reportUtilityOptions.facilities.forEach(facility => {
      if (!facility.selected) {
        removeFacilityId.push(facility.id);
      }
    })
    accountMeters = accountMeters.filter(meter => {
      return !removeFacilityId.includes(meter.facilityId);
    });
    this.accountReportUtilitySummary = this.overviewReportService.getUtilityUsageData(accountMeters, this.reportUtilityOptions, true);
  }

  setFacilitiesUtilitySummaries() {
    this.facilitiesUtilitySummaries = new Array();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    this.reportUtilityOptions.facilities.forEach(facility => {
      if (facility.selected) {
        let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == facility.id });
        let utilitySummary: ReportUtilitySummary = this.overviewReportService.getUtilityUsageData(facilityMeters, this.reportUtilityOptions, true);
        this.facilitiesUtilitySummaries.push({
          facility: facility,
          utilitySummary: utilitySummary
        })
      }
    })

  }
}

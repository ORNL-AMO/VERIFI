import { Component, Input, OnInit } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { ReportOptions, ReportUtilitySummary } from 'src/app/models/overview-report';
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
    private meterSummaryService: MeterSummaryService, private utilityMeterDbService: UtilityMeterdbService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.setFacilitySummary();
    this.setFacilitiesUtilitySummaries();
    this.setAccountFacilities();
  }


  setAccountFacilities() {
    this.accountFacilitiesSummary = this.meterSummaryService.getAccountFacilitesSummary(this.reportOptions);
  }

  setFacilitySummary() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let removeFacilityId: Array<number> = new Array();
    this.reportOptions.facilities.forEach(facility => {
      if (!facility.selected) {
        removeFacilityId.push(facility.facilityId);
      }
    })
    accountMeters = accountMeters.filter(meter => {
      return !removeFacilityId.includes(meter.facilityId);
    });
    this.accountReportUtilitySummary = this.overviewReportService.getUtilityUsageData(accountMeters, this.reportOptions, true);
  }

  setFacilitiesUtilitySummaries() {
    this.facilitiesUtilitySummaries = new Array();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    this.reportOptions.facilities.forEach(facility => {
      if (facility.selected) {
        let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == facility.facilityId });
        let utilitySummary: ReportUtilitySummary = this.overviewReportService.getUtilityUsageData(facilityMeters, this.reportOptions, true);
        let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
        let selectedFacility: IdbFacility = accountFacilites.find(accountFacility => { return accountFacility.id == facility.facilityId })
        this.facilitiesUtilitySummaries.push({
          facility: selectedFacility,
          utilitySummary: utilitySummary
        })
      }
    })

  }
}

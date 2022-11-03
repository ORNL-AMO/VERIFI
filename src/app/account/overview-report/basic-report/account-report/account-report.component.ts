import { Component, Input, OnInit } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbAccount, IdbFacility, IdbUtilityMeter, MeterSource } from 'src/app/models/idb';
import { ReportOptions, ReportUtilitySummary } from 'src/app/models/overview-report';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
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
    totalMarketEmissions: undefined,
    totalLocationEmissions: undefined,
    allMetersLastBill: undefined,
    totalConsumption: undefined
  };
  accountReportUtilitySummary: ReportUtilitySummary;
  facilitiesUtilitySummaries: Array<{
    utilitySummary: ReportUtilitySummary,
    facility: IdbFacility
  }>;

  calanderizedAccountMeters: Array<CalanderizedMeter>;
  constructor(private overviewReportService: OverviewReportService,
    private meterSummaryService: MeterSummaryService, private utilityMeterDbService: UtilityMeterdbService,
    private facilityDbService: FacilitydbService,
    private calanderizationService: CalanderizationService) { }

  ngOnInit(): void {
    let includedMeters: Array<IdbUtilityMeter> = this.getMetersForCalanderization();
    this.calanderizedAccountMeters = this.calanderizationService.getCalanderizedMeterData(includedMeters, true, true, this.reportOptions);
    this.setFacilitySummary();
    this.setFacilitiesUtilitySummaries();
    this.setAccountFacilities();
  }


  getMetersForCalanderization(): Array<IdbUtilityMeter> {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityIds: Array<string> = this.reportOptions.facilities.map(facility => {
      if (facility.selected) {
        return facility.facilityId
      }
    });
    let sources: Array<MeterSource> = this.overviewReportService.getSelectedSources(this.reportOptions);
    let includedMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return facilityIds.includes(meter.facilityId) && sources.includes(meter.source) });
    return includedMeters;
  }

  setAccountFacilities() {
    this.accountFacilitiesSummary = this.meterSummaryService.getDashboardAccountFacilitiesSummary(this.calanderizedAccountMeters);
  }

  setFacilitySummary() {
    this.accountReportUtilitySummary = this.overviewReportService.getUtilityUsageData(this.calanderizedAccountMeters, this.reportOptions, true);
  }

  setFacilitiesUtilitySummaries() {
    this.facilitiesUtilitySummaries = new Array();
    this.reportOptions.facilities.forEach(facility => {
      if (facility.selected) {
        let facilityMeters: Array<CalanderizedMeter> = this.calanderizedAccountMeters.filter(cMeter => { return cMeter.meter.facilityId == facility.facilityId });
        let utilitySummary: ReportUtilitySummary = this.overviewReportService.getUtilityUsageData(facilityMeters, this.reportOptions, true);
        let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
        let selectedFacility: IdbFacility = accountFacilites.find(accountFacility => { return accountFacility.guid == facility.facilityId })
        this.facilitiesUtilitySummaries.push({
          facility: selectedFacility,
          utilitySummary: utilitySummary
        })
      }
    })

  }
}

import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbAccount } from 'src/app/models/idb';
import { MeterSummaryService } from 'src/app/shared/helper-services/meter-summary.service';
import { OverviewReportService, ReportOptions } from '../overview-report.service';

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

  accountFacilitiesSummary: AccountFacilitiesSummary = {
    facilitySummaries: [],
    totalEnergyUse: undefined,
    totalEnergyCost: undefined,
    totalNumberOfMeters: undefined,
    totalEmissions: undefined,
    allMetersLastBill: undefined
  };

  constructor(private accountDbService: AccountdbService, private overviewReportService: OverviewReportService,
    private meterSummaryService: MeterSummaryService) { }

  ngOnInit(): void {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.account = account
      this.setAccountFacilities();
    });

    this.reportOptionsSub = this.overviewReportService.reportOptions.subscribe(reportOptions => {
      this.reportOptions = reportOptions;
    });
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.reportOptionsSub.unsubscribe();
  }

  setAccountFacilities() {
    this.accountFacilitiesSummary = this.meterSummaryService.getAccountFacilitesSummary();

  }

  setEmpty() {
    this.accountFacilitiesSummary = {
      facilitySummaries: [],
      totalEnergyUse: undefined,
      totalEnergyCost: undefined,
      totalNumberOfMeters: undefined,
      totalEmissions: undefined,
      allMetersLastBill: undefined
    };
  }
}

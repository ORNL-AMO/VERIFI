import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount, IdbUtilityMeter } from 'src/app/models/idb';
import { OverviewReportService, ReportUtilityOptions, ReportUtilitySummary } from '../../overview-report.service';

@Component({
  selector: 'app-account-report-utility-usage-table',
  templateUrl: './account-report-utility-usage-table.component.html',
  styleUrls: ['./account-report-utility-usage-table.component.css']
})
export class AccountReportUtilityUsageTableComponent implements OnInit {
  @Input()
  account: IdbAccount;
  
  reportUtilityOptions: ReportUtilityOptions;
  reportUtilityOptionsSub: Subscription;
  accountReportUtilitySummary: ReportUtilitySummary;
  constructor(private utilityMeterDbService: UtilityMeterdbService, private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.reportUtilityOptionsSub = this.overviewReportService.reportUtilityOptions.subscribe(reportUtilityOptions => {
      this.reportUtilityOptions = reportUtilityOptions
      this.setFacilitySummary();
    });
  }

  ngOnDestroy() {
    this.reportUtilityOptionsSub.unsubscribe();
  }

  setFacilitySummary() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    this.accountReportUtilitySummary = this.overviewReportService.getUtilityUsageData(accountMeters, this.reportUtilityOptions, true);
  }
}

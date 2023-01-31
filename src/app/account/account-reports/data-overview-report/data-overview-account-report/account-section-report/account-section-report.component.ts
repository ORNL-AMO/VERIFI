import { Component, Input } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AccountFacilitiesSummary, UtilityUsageSummaryData, YearMonthData } from 'src/app/models/dashboard';
import { IdbAccount, IdbAccountReport } from 'src/app/models/idb';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-account-section-report',
  templateUrl: './account-section-report.component.html',
  styleUrls: ['./account-section-report.component.css']
})
export class AccountSectionReportComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  accountFacilitiesSummary: AccountFacilitiesSummary;
  @Input()
  utilityUsageSummaryData: UtilityUsageSummaryData;
  @Input()
  yearMonthData: Array<YearMonthData>;
  @Input()
  calanderizedMeters: Array<CalanderizedMeter>;

  sectionOptions: DataOverviewReportSetup;
  waterUnit: string;
  energyUnit: string;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountDbService: AccountdbService) {
  }

  ngOnInit() {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.waterUnit = account.volumeLiquidUnit;
    this.energyUnit = account.energyUnit;
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    this.sectionOptions = selectedReport.dataOverviewReportSetup;
  }

}

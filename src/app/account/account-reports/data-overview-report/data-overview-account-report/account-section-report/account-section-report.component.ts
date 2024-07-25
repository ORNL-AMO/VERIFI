import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountOverviewData, AccountOverviewFacility } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { IUseAndCost, UseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { YearMonthData } from 'src/app/models/dashboard';
import { IdbAccountReport } from 'src/app/models/idb';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { AccountReportsService } from '../../../account-reports.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
  selector: 'app-account-section-report',
  templateUrl: './account-section-report.component.html',
  styleUrls: ['./account-section-report.component.css']
})
export class AccountSectionReportComponent {
  @Input()
  dataType: 'energyUse' | 'cost' | 'water' | 'emissions';
  @Input()
  dateRange: {
    startDate: Date,
    endDate: Date
  };
  @Input()
  previousYear: Date;
  @Input()
  accountOverviewFacilities: Array<AccountOverviewFacility>;
  @Input()
  sourcesUseAndCost: Array<UseAndCost>;
  @Input()
  useAndCostTotal: {
      end: IUseAndCost;
      average: IUseAndCost;
      previousYear: IUseAndCost;
  };
  @Input()
  calanderizedMeters: Array<CalanderizedMeter>;
  @Input()
  accountOverviewData: AccountOverviewData;
  @Input()
  yearMonthData: Array<YearMonthData>;

  sectionOptions: DataOverviewReportSetup;
  waterUnit: string;
  energyUnit: string;
  printSub: Subscription;
  print: boolean;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountDbService: AccountdbService,
    private accountReportsService: AccountReportsService) {
  }

  ngOnInit() {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.waterUnit = account.volumeLiquidUnit;
    this.energyUnit = account.energyUnit;
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    this.sectionOptions = selectedReport.dataOverviewReportSetup;

    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
    });
  }

  ngOnDestroy(){
    this.printSub.unsubscribe();
  }

}

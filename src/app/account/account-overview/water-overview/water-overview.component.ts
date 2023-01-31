import { Component, OnInit } from '@angular/core';
import { AccountOverviewService } from '../account-overview.service';
import { Subscription } from 'rxjs';
import { AccountFacilitiesSummary, UtilityUsageSummaryData, YearMonthData } from 'src/app/models/dashboard';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';


@Component({
  selector: 'app-water-overview',
  templateUrl: './water-overview.component.html',
  styleUrls: ['./water-overview.component.css']
})
export class WaterOverviewComponent implements OnInit {

  lastMonthsDate: Date;
  yearPriorDate: Date;
  accountFacilitiesSummarySub: Subscription;
  calculatingSub: Subscription;
  calculating: boolean;
  accountFacilitiesSummary: AccountFacilitiesSummary;
  utilityUsageSummaryData: UtilityUsageSummaryData;
  utilityUsageSummaryDataSub: Subscription;
  selectedAccountSub: Subscription;
  waterUnit: string;
  yearMonthData: Array<YearMonthData>;
  yearMonthDataSub: Subscription;
  calanderizedMeters: Array<CalanderizedMeter>;
  constructor(private accountOverviewService: AccountOverviewService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.calanderizedMeters = this.accountOverviewService.calanderizedMeters;
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      if (val) {
        this.waterUnit = val.volumeLiquidUnit;
      }
    });
    this.calculatingSub = this.accountOverviewService.calculatingWater.subscribe(val => {
      this.calculating = val;
    })

    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesWaterSummary.subscribe(accountFacilitiesSummary => {
      this.accountFacilitiesSummary = accountFacilitiesSummary;
      if (accountFacilitiesSummary.allMetersLastBill) {
        this.lastMonthsDate = new Date(accountFacilitiesSummary.allMetersLastBill.year, accountFacilitiesSummary.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(accountFacilitiesSummary.allMetersLastBill.year - 1, accountFacilitiesSummary.allMetersLastBill.monthNumValue + 1);
      } else {
        this.lastMonthsDate = undefined;
        this.yearPriorDate = undefined;
      }
    });

    this.utilityUsageSummaryDataSub = this.accountOverviewService.waterUtilityUsageSummaryData.subscribe(utilityUsageSummaryData => {
      this.utilityUsageSummaryData = utilityUsageSummaryData;
    });
    
    this.yearMonthDataSub = this.accountOverviewService.waterYearMonthData.subscribe(yearMonthData => {
      this.yearMonthData = yearMonthData;
    });
  }

  ngOnDestroy() {
    this.accountFacilitiesSummarySub.unsubscribe();
    this.calculatingSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
    this.utilityUsageSummaryDataSub.unsubscribe();
    this.yearMonthDataSub.unsubscribe();
  }

}

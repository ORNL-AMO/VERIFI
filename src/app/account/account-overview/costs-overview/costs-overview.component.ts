import { Component, OnInit } from '@angular/core';
import { AccountOverviewService } from '../account-overview.service';
import { Subscription } from 'rxjs';
import { AccountFacilitiesSummary, UtilityUsageSummaryData, YearMonthData } from 'src/app/models/dashboard';
import { CalanderizedMeter } from 'src/app/models/calanderization';

@Component({
  selector: 'app-costs-overview',
  templateUrl: './costs-overview.component.html',
  styleUrls: ['./costs-overview.component.css']
})
export class CostsOverviewComponent implements OnInit {

  lastMonthsDate: Date;
  yearPriorDate: Date;
  accountFacilitiesSummarySub: Subscription;
  calculatingSub: Subscription;
  calculating: boolean;
  displayWarning: boolean;
  accountFacilitiesSummary: AccountFacilitiesSummary;
  utilityUsageSummaryData: UtilityUsageSummaryData;
  utilityUsageSummaryDataSub: Subscription;
  yearMonthData: Array<YearMonthData>;
  yearMonthDataSub: Subscription;
  calanderizedMeters: Array<CalanderizedMeter>;
  constructor(private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    this.calanderizedMeters = this.accountOverviewService.calanderizedMeters;
    this.calculatingSub = this.accountOverviewService.calculatingCosts.subscribe(val => {
      this.calculating = val;
    })

    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesCostsSummary.subscribe(accountFacilitiesSummary => {
      this.accountFacilitiesSummary = accountFacilitiesSummary;
      if (accountFacilitiesSummary.allMetersLastBill) {
        this.displayWarning = accountFacilitiesSummary.totalEnergyCost == 0;
        this.lastMonthsDate = new Date(accountFacilitiesSummary.allMetersLastBill.year, accountFacilitiesSummary.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(accountFacilitiesSummary.allMetersLastBill.year - 1, accountFacilitiesSummary.allMetersLastBill.monthNumValue + 1);
      } else {
        this.lastMonthsDate = undefined;
        this.yearPriorDate = undefined;
      }
    });
    this.utilityUsageSummaryDataSub = this.accountOverviewService.costsUtilityUsageSummaryData.subscribe(utilityUsageSummaryData => {
      this.utilityUsageSummaryData = utilityUsageSummaryData;
    });
    
    this.yearMonthDataSub = this.accountOverviewService.costsYearMonthData.subscribe(yearMonthData => {
      this.yearMonthData = yearMonthData;
    });
  }

  ngOnDestroy(){
    this.accountFacilitiesSummarySub.unsubscribe();
    this.calculatingSub.unsubscribe();
    this.utilityUsageSummaryDataSub.unsubscribe();
    this.yearMonthDataSub.unsubscribe();
  }

}

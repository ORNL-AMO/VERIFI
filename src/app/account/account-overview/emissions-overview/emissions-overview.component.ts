import { Component, OnInit } from '@angular/core';
import { AccountOverviewService } from '../account-overview.service';
import { Subscription } from 'rxjs';
import { AccountFacilitiesSummary, UtilityUsageSummaryData, YearMonthData } from 'src/app/models/dashboard';
import { CalanderizedMeter } from 'src/app/models/calanderization';

@Component({
  selector: 'app-emissions-overview',
  templateUrl: './emissions-overview.component.html',
  styleUrls: ['./emissions-overview.component.css']
})
export class EmissionsOverviewComponent implements OnInit {

  lastMonthsDate: Date;
  yearPriorDate: Date;
  accountFacilitiesSummarySub: Subscription;
  calculatingSub: Subscription;
  calculating: boolean;
  accountFacilitiesSummary: AccountFacilitiesSummary;
  utilityUsageSummaryData: UtilityUsageSummaryData;
  utilityUsageSummaryDataSub: Subscription;
  yearMonthData: Array<YearMonthData>;
  yearMonthDataSub: Subscription;
  calanderizedMeters: Array<CalanderizedMeter>;
  constructor(private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    this.calanderizedMeters = this.accountOverviewService.calanderizedMeters;
    this.calculatingSub = this.accountOverviewService.calculatingEnergy.subscribe(val => {
      this.calculating = val;
    })

    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesEnergySummary.subscribe(accountFacilitiesSummary => {
      this.accountFacilitiesSummary = accountFacilitiesSummary;
      if (accountFacilitiesSummary.allMetersLastBill) {
        this.lastMonthsDate = new Date(accountFacilitiesSummary.allMetersLastBill.year, accountFacilitiesSummary.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(accountFacilitiesSummary.allMetersLastBill.year - 1, accountFacilitiesSummary.allMetersLastBill.monthNumValue + 1);
      } else {
        this.lastMonthsDate = undefined;
        this.yearPriorDate = undefined;
      }
    });
    
    this.utilityUsageSummaryDataSub = this.accountOverviewService.energyUtilityUsageSummaryData.subscribe(utilityUsageSummaryData => {
      this.utilityUsageSummaryData = utilityUsageSummaryData;
    });
    
    this.yearMonthDataSub = this.accountOverviewService.energyYearMonthData.subscribe(yearMonthData => {
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

import { Component, OnInit } from '@angular/core';
import { AccountOverviewService } from '../account-overview.service';
import { Subscription } from 'rxjs';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { YearMonthData } from 'src/app/models/dashboard';

@Component({
    selector: 'app-costs-overview',
    templateUrl: './costs-overview.component.html',
    styleUrls: ['./costs-overview.component.css'],
    standalone: false
})
export class CostsOverviewComponent implements OnInit {


  calculatingSub: Subscription;
  calculating: boolean | 'error';
  displayWarning: boolean;

  accountOverviewDataSub: Subscription;
  accountOverviewData: AccountOverviewData;
  utilityUseAndCostSub: Subscription;
  utilityUseAndCost: UtilityUseAndCost;
  dateRangeSub: Subscription;
  dateRange: { startDate: Date, endDate: Date };
  constructor(private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    this.calculatingSub = this.accountOverviewService.calculating.subscribe(val => {
      this.calculating = val;
    })

    this.dateRangeSub = this.accountOverviewService.dateRange.subscribe(dateRange => {
      this.dateRange = dateRange;
    });

    this.accountOverviewDataSub = this.accountOverviewService.accountOverviewData.subscribe(val => {
      this.accountOverviewData = val;
      if (this.accountOverviewData) {
        let test: YearMonthData = this.accountOverviewData.allSourcesYearMonthData.find(data => {
          return data.energyCost != 0 && isNaN(data.energyCost) == false;
        });
        this.displayWarning = test == undefined;
      }
    });

    this.utilityUseAndCostSub = this.accountOverviewService.utilityUseAndCost.subscribe(val => {
      this.utilityUseAndCost = val;
    });
  }

  ngOnDestroy() {
    this.calculatingSub.unsubscribe();
    this.accountOverviewDataSub.unsubscribe();
    this.utilityUseAndCostSub.unsubscribe();
    this.dateRangeSub.unsubscribe();
  }

}

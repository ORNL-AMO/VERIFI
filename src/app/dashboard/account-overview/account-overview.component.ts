import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDatadbService } from '../../indexedDB/utilityMeterData-db.service';
import { DashboardService } from '../dashboard.service';

@Component({
  selector: 'app-account-overview',
  templateUrl: './account-overview.component.html',
  styleUrls: ['./account-overview.component.css', '../dashboard.component.css']
})
export class AccountOverviewComponent implements OnInit {

  lastMonthsDate: Date;
  yearPriorDate: Date;
  utilityMeterAccountData: Array<IdbUtilityMeterData>;
  accountMeterDataSub: Subscription;

  graphDisplaySub: Subscription;
  chartsLabel: "Costs" | "Usage";
  heatMapShown: boolean = false;
  constructor(public utilityMeterDataDbService: UtilityMeterDatadbService, private dashboardService: DashboardService) { }

  ngOnInit(): void {

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(utilityMeterAccountData => {
      this.utilityMeterAccountData = utilityMeterAccountData;

      let accountFacilitiesSummary: AccountFacilitiesSummary = this.dashboardService.getAccountFacilitesSummary();
      if (accountFacilitiesSummary.allMetersLastBill) {
        this.lastMonthsDate = new Date(accountFacilitiesSummary.allMetersLastBill.year, accountFacilitiesSummary.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(accountFacilitiesSummary.allMetersLastBill.year - 1, accountFacilitiesSummary.allMetersLastBill.monthNumValue);
      }
    });

    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(value => {
      if (value == "cost") {
        this.chartsLabel = "Costs";
      } else if (value == "usage") {
        this.chartsLabel = "Usage";
      }
    })
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
    this.graphDisplaySub.unsubscribe();
  }

  toggleHeatMap() {
    this.heatMapShown = !this.heatMapShown;
  }

}

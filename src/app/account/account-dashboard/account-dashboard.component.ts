import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';
import { DashboardService } from 'src/app/shared/helper-services/dashboard.service';

@Component({
  selector: 'app-account-dashboard',
  templateUrl: './account-dashboard.component.html',
  styleUrls: ['./account-dashboard.component.css']
})
export class AccountDashboardComponent implements OnInit {

  lastMonthsDate: Date;
  yearPriorDate: Date;
  utilityMeterAccountData: Array<IdbUtilityMeterData>;

  graphDisplaySub: Subscription;
  chartsLabel: "Costs" | "Usage" | "Emissions";
  heatMapShown: boolean = false;

  selectedAccountSub: Subscription;
  accountFacilitiesSummarySub: Subscription;
  constructor(public utilityMeterDataDbService: UtilityMeterDatadbService, private dashboardService: DashboardService,
    private facilityDbService: FacilitydbService, private router: Router,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {

    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.utilityMeterAccountData = this.utilityMeterDataDbService.accountMeterData.getValue();
      if (this.utilityMeterAccountData.length != 0) {
        this.dashboardService.setAccountFacilitiesSummary();
      }

    });

    this.accountFacilitiesSummarySub = this.dashboardService.accountFacilitiesSummary.subscribe(accountFacilitiesSummary => {
      if (accountFacilitiesSummary && accountFacilitiesSummary.allMetersLastBill) {
        this.lastMonthsDate = new Date(accountFacilitiesSummary.allMetersLastBill.year, accountFacilitiesSummary.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(accountFacilitiesSummary.allMetersLastBill.year - 1, accountFacilitiesSummary.allMetersLastBill.monthNumValue);
      }
    });

    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(value => {
      if (value == "cost") {
        this.chartsLabel = "Costs";
      } else if (value == "usage") {
        this.chartsLabel = "Usage";
      } else if (value == "emissions") {
        this.chartsLabel = "Emissions";
      }
    })
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.accountFacilitiesSummarySub.unsubscribe();
    this.graphDisplaySub.unsubscribe();
  }

  toggleHeatMap() {
    this.heatMapShown = !this.heatMapShown;
  }

  addUtilityData() {
    //TODO: Update select facility call
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (facilities.length > 0) {
      this.router.navigateByUrl('facility/' + facilities[0].id + '/utility');
    }
  }
}

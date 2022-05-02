import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';
import { DashboardService } from 'src/app/shared/helper-services/dashboard.service';
import { MeterSummaryService } from 'src/app/shared/helper-services/meter-summary.service';

@Component({
  selector: 'app-account-dashboard',
  templateUrl: './account-dashboard.component.html',
  styleUrls: ['./account-dashboard.component.css']
})
export class AccountDashboardComponent implements OnInit {

  lastMonthsDate: Date;
  yearPriorDate: Date;
  utilityMeterAccountData: Array<IdbUtilityMeterData>;
  accountMeterDataSub: Subscription;

  graphDisplaySub: Subscription;
  chartsLabel: "Costs" | "Usage" | "Emissions";
  heatMapShown: boolean = false;
  constructor(public utilityMeterDataDbService: UtilityMeterDatadbService, private dashboardService: DashboardService, private meterSummaryService: MeterSummaryService,
    private facilityDbService: FacilitydbService, private router: Router) { }

  ngOnInit(): void {

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(utilityMeterAccountData => {
      console.log('CHANGE CALC')
      this.utilityMeterAccountData = utilityMeterAccountData;

      let accountFacilitiesSummary: AccountFacilitiesSummary = this.meterSummaryService.getAccountFacilitesSummary();
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
      } else if (value == "emissions") {
        this.chartsLabel = "Emissions";
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

  addUtilityData() {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    if (facilities.length > 0) {
      this.router.navigateByUrl('facility/' + facilities[0].id + '/utility');
    }
  }
}

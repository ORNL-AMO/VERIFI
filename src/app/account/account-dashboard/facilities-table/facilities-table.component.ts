import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idb';
import * as _ from 'lodash';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { DashboardService } from 'src/app/shared/helper-services/dashboard.service';

@Component({
  selector: 'app-facilities-table',
  templateUrl: './facilities-table.component.html',
  styleUrls: ['./facilities-table.component.css']
})
export class FacilitiesTableComponent implements OnInit {

  selectedAccountSub: Subscription;
  accountEnergyUnit: string;
  accountFacilitiesSummary: AccountFacilitiesSummary = {
    facilitySummaries: [],
    totalEnergyUse: undefined,
    totalEnergyCost: undefined,
    totalNumberOfMeters: undefined,
    totalEmissions: undefined,
    allMetersLastBill: undefined
  };
  lastMonthsDate: Date;
  yearPriorDate: Date;
  accountFacilitiesSummarySub: Subscription;
  constructor(
    private router: Router, private accountdbService: AccountdbService,
    private dashboardService: DashboardService) { }

  ngOnInit(): void {

    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(val => {
      if (val) {
        this.accountEnergyUnit = val.energyUnit;
      }
    });

    this.accountFacilitiesSummarySub = this.dashboardService.accountFacilitiesSummary.subscribe(summary => {
      this.accountFacilitiesSummary = summary;
      if (this.accountFacilitiesSummary.allMetersLastBill) {
        this.lastMonthsDate = new Date(this.accountFacilitiesSummary.allMetersLastBill.year, this.accountFacilitiesSummary.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(this.accountFacilitiesSummary.allMetersLastBill.year - 1, this.accountFacilitiesSummary.allMetersLastBill.monthNumValue);
      } else {
        this.lastMonthsDate = undefined;
        this.yearPriorDate = undefined;
      }
    })
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.accountFacilitiesSummarySub.unsubscribe();
  }


  selectFacility(facility: IdbFacility) {
    this.router.navigateByUrl('facility/' + facility.id);
  }
}

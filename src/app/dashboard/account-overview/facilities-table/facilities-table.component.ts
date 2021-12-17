import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { DashboardService } from '../../dashboard.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountFacilitiesSummary, FacilitySummary } from 'src/app/models/dashboard';

@Component({
  selector: 'app-facilities-table',
  templateUrl: './facilities-table.component.html',
  styleUrls: ['./facilities-table.component.css', '../../dashboard.component.css']
})
export class FacilitiesTableComponent implements OnInit {

  accountFacilitiesSub: Subscription;
  accountMeterDataSub: Subscription;
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
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private facilityDbService: FacilitydbService,
    private router: Router, private dashboardService: DashboardService, private accountdbService: AccountdbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(val => {
      if (val) {
        this.accountEnergyUnit = val.energyUnit;
      }
    });

    this.accountFacilitiesSub = this.facilityDbService.accountFacilities.subscribe(accountFacilities => {
      if (accountFacilities && accountFacilities.length != 0) {
        this.setAccountFacilities();
      } else {
        this.setEmpty()
      }
    });

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      if (val && val.length != 0) {
        this.setAccountFacilities();
      } else {
        this.setEmpty()
      }
    });
  }

  ngOnDestroy() {
    this.accountFacilitiesSub.unsubscribe();
    this.accountMeterDataSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }


  selectFacility(facility: IdbFacility) {
    this.facilityDbService.selectedFacility.next(facility);
    this.router.navigateByUrl('/home/facility-summary');
  }

  setAccountFacilities() {
    this.accountFacilitiesSummary = this.dashboardService.getAccountFacilitesSummary();
    if (this.accountFacilitiesSummary.allMetersLastBill) {
      this.lastMonthsDate = new Date(this.accountFacilitiesSummary.allMetersLastBill.year, this.accountFacilitiesSummary.allMetersLastBill.monthNumValue);
      this.yearPriorDate = new Date(this.accountFacilitiesSummary.allMetersLastBill.year - 1, this.accountFacilitiesSummary.allMetersLastBill.monthNumValue);
    }
  }

  setEmpty() {
    this.accountFacilitiesSummary = {
      facilitySummaries: [],
      totalEnergyUse: undefined,
      totalEnergyCost: undefined,
      totalNumberOfMeters: undefined,
      totalEmissions: undefined,
      allMetersLastBill: undefined
    };
    this.lastMonthsDate = undefined;
    this.yearPriorDate = undefined;

  }
}

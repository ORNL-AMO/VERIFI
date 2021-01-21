import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, SubscriptionLike } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { DashboardService, FacilitySummary } from '../../dashboard.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
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
  facilitiesSummary: Array<FacilitySummary>;
  totalEnergyUsage: number;
  totalEnergyCost: number;
  totalMeters: number;
  todaysDate: Date;
  yearAgoDate: Date;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private facilityDbService: FacilitydbService,
    private router: Router, private dashboardService: DashboardService, private accountdbService: AccountdbService) { }

  ngOnInit(): void {
    this.todaysDate = new Date();
    this.yearAgoDate = new Date((this.todaysDate.getFullYear() - 1), (this.todaysDate.getMonth()));

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
    this.router.navigateByUrl('/facility-summary');
  }

  setAccountFacilities() {
    this.facilitiesSummary = this.dashboardService.getAccountFacilitesSummary();
    this.totalEnergyUsage = _.sumBy(this.facilitiesSummary, 'energyUsage');
    this.totalMeters = _.sumBy(this.facilitiesSummary, 'numberOfMeters');
    this.totalEnergyCost = _.sumBy(this.facilitiesSummary, 'energyCost');
  }

  setEmpty() {
    this.facilitiesSummary = new Array();
    this.totalEnergyUsage = 0;
    this.totalMeters = 0;
    this.totalEnergyCost = 0;
  }
}

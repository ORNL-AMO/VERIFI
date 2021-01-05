import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { DashboardService } from '../dashboard.service';

@Component({
  selector: 'app-account-overview',
  templateUrl: './account-overview.component.html',
  styleUrls: ['./account-overview.component.css', '../dashboard.component.css']
})
export class AccountOverviewComponent implements OnInit {

  accountMeterDataSub: Subscription;
  lastBillEnergyUse: number;
  lastBillEnergyCost: number;
  lastMonthsDate: Date;
  averageEnergyCost: number;
  averageEnergyUse: number;
  constructor(private facilityDbService: FacilitydbService, private router: Router, private dashboardService: DashboardService, private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    let lastMonthYear: { lastMonth: number, lastMonthYear: number } = this.dashboardService.getLastMonthYear();
    this.lastMonthsDate = new Date(lastMonthYear.lastMonthYear, lastMonthYear.lastMonth);
    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      if (val && val.length != 0) {
        this.setUsageValues();
      }
    });
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
  }


  selectFacility(facility: IdbFacility) {
    this.facilityDbService.selectedFacility.next(facility);
    this.router.navigateByUrl('/facility-summary');
  }

  setUsageValues() {
    this.lastBillEnergyCost = 0;
    this.lastBillEnergyUse = 0;
    this.averageEnergyCost = 0;
    this.averageEnergyUse = 0;
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    accountFacilities.forEach(facility => {
      //last month
      let lastBillUsage: { energyUse: number, energyCost: number } = this.dashboardService.getLastMonthsEnergyUseAndCost(facility);
      this.lastBillEnergyUse += lastBillUsage.energyUse;
      this.lastBillEnergyCost += lastBillUsage.energyCost;
      //average
      let averageEnergyUsage: { energyUse: number, energyCost: number } = this.dashboardService.getAverageEnergyUseAndCost(facility);
      this.averageEnergyCost += averageEnergyUsage.energyCost;
      this.averageEnergyUse += averageEnergyUsage.energyUse;
    });
  }
}

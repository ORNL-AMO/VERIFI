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

  accountFacilities: Array<IdbFacility>;
  accountFacilitiesSub: Subscription;
  lastBillEnergyUse: number;
  lastBillEnergyCost: number;
  lastMonthsDate: Date;
  averageEnergyCost: number;
  averageEnergyUse: number;
  constructor(private facilityDbService: FacilitydbService, private router: Router, private dashboardService: DashboardService, private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    let lastMonthYear: { lastMonth: number, lastMonthYear: number } = this.dashboardService.getLastMonthYear();
    // -1 because months 0 indexed
    this.lastMonthsDate = new Date(lastMonthYear.lastMonthYear, (lastMonthYear.lastMonth - 1));
    this.accountFacilitiesSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      if (val && val.length != 0) {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        let lastBillUsage: { energyUse: number, energyCost: number } = this.dashboardService.getLastMonthsEnergyUseAndCost(selectedFacility);
        this.lastBillEnergyUse = lastBillUsage.energyUse;
        this.lastBillEnergyCost = lastBillUsage.energyCost;
        let averageEnergyUsage: { energyUse: number, energyCost: number } = this.dashboardService.getAverageEnergyUseAndCost(selectedFacility);
        console.log(averageEnergyUsage);
        this.averageEnergyCost = averageEnergyUsage.energyCost;
        this.averageEnergyUse = averageEnergyUsage.energyUse;
      }
    });
  }

  ngOnDestroy() {
    this.accountFacilitiesSub.unsubscribe();
  }


  selectFacility(facility: IdbFacility) {
    this.facilityDbService.selectedFacility.next(facility);
    this.router.navigateByUrl('/facility-summary');
  }
}

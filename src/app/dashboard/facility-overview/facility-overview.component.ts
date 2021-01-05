import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';
import { DashboardService } from '../dashboard.service';

@Component({
  selector: 'app-facility-overview',
  templateUrl: './facility-overview.component.html',
  styleUrls: ['./facility-overview.component.css', '../dashboard.component.css']
})
export class FacilityOverviewComponent implements OnInit {

  lastBillEnergyUse: number;
  lastBillEnergyCost: number;
  lastMonthsDate: Date;
  averageEnergyCost: number;
  averageEnergyUse: number;
  accountMeterDataSub: Subscription;
  accountMeterData: Array<IdbUtilityMeterData>;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  constructor(private dashboardService: DashboardService, private utilityMeterDataDbService: UtilityMeterDatadbService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    let lastMonthYear: { lastMonth: number, lastMonthYear: number } = this.dashboardService.getLastMonthYear();
    this.lastMonthsDate = new Date(lastMonthYear.lastMonthYear, lastMonthYear.lastMonth);

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      this.setUsageValues();
    })

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(accountMeterData => {
      this.accountMeterData = accountMeterData;
      this.setUsageValues();
    });
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }


  setUsageValues() {
    if (this.accountMeterData && this.accountMeterData.length != 0 && this.selectedFacility) {
      //last month
      let lastBillUsage: { energyUse: number, energyCost: number } = this.dashboardService.getLastMonthsEnergyUseAndCost(this.selectedFacility);
      this.lastBillEnergyUse = lastBillUsage.energyUse;
      this.lastBillEnergyCost = lastBillUsage.energyCost;
      //average
      let averageEnergyUsage: { energyUse: number, energyCost: number } = this.dashboardService.getAverageEnergyUseAndCost(this.selectedFacility);
      this.averageEnergyCost = averageEnergyUsage.energyCost;
      this.averageEnergyUse = averageEnergyUsage.energyUse;
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from 'src/app/shared/helper-services/dashboard.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityUsageSummaryData } from 'src/app/models/dashboard';
import { IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';

@Component({
  selector: 'app-utility-energy-use-table',
  templateUrl: './utility-energy-use-table.component.html',
  styleUrls: ['./utility-energy-use-table.component.css']
})
export class UtilityEnergyUseTableComponent implements OnInit {

  utilityUsageSummaryDataSub: Subscription;
  accountMeterData: Array<IdbUtilityMeterData>;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  utilityUsageSummaryData: UtilityUsageSummaryData;
  lastMonthsDate: Date;
  yearPriorDate: Date;
  yearPriorLastMonth: Date;
  facilityEnergyUnit: string;
  emissionsDisplay: "location" | "market";
  emissionsDisplaySub: Subscription;
  constructor(private dashboardService: DashboardService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      if (this.selectedFacility) {
        this.facilityEnergyUnit = this.selectedFacility.energyUnit;
      }
    })

    this.utilityUsageSummaryDataSub = this.dashboardService.facilityUtilityUsageSummaryData.subscribe(val => {
      this.utilityUsageSummaryData = val;
      if (this.utilityUsageSummaryData.total && this.utilityUsageSummaryData.allMetersLastBill) {
        this.lastMonthsDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue + 1);
        this.yearPriorLastMonth = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue);
      }
    });
    this.emissionsDisplaySub = this.dashboardService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
    })
  }

  ngOnDestroy() {
    this.utilityUsageSummaryDataSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
  }
}

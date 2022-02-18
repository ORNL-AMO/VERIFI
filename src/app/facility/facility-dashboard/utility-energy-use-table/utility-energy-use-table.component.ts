import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from 'src/app/shared/helper-services/dashboard.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityUsageSummaryData } from 'src/app/models/dashboard';
import { IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';

@Component({
  selector: 'app-utility-energy-use-table',
  templateUrl: './utility-energy-use-table.component.html',
  styleUrls: ['./utility-energy-use-table.component.css']
})
export class UtilityEnergyUseTableComponent implements OnInit {

  accountMeterDataSub: Subscription;
  accountMeterData: Array<IdbUtilityMeterData>;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  utilityUsageSummaryData: UtilityUsageSummaryData;
  lastMonthsDate: Date;
  yearPriorDate: Date;
  yearPriorLastMonth: Date;
  facilityEnergyUnit: string;
  constructor(private dashboardService: DashboardService, private utilityMeterDataDbService: UtilityMeterDatadbService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      if (this.selectedFacility) {
        this.facilityEnergyUnit = this.selectedFacility.energyUnit;
        this.setUsageValues();
      }
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
      this.utilityUsageSummaryData = this.dashboardService.getFacilityUtilityUsageSummaryData(this.selectedFacility, false);
      if (this.utilityUsageSummaryData.total && this.utilityUsageSummaryData.allMetersLastBill) {
        this.lastMonthsDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue + 1);
        this.yearPriorLastMonth = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue );
      }
    }
  }
}

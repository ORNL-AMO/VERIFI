import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityUsageSummaryData } from 'src/app/models/dashboard';
import { IdbUtilityMeterData } from 'src/app/models/idb';
import { FacilityOverviewService } from '../../facility-overview.service';

@Component({
  selector: 'app-energy-utilities-usage-table',
  templateUrl: './energy-utilities-usage-table.component.html',
  styleUrls: ['./energy-utilities-usage-table.component.css']
})
export class EnergyUtilitiesUsageTableComponent implements OnInit {

  utilityUsageSummaryDataSub: Subscription;
  accountMeterData: Array<IdbUtilityMeterData>;
  selectedFacilitySub: Subscription;

  utilityUsageSummaryData: UtilityUsageSummaryData;
  lastMonthsDate: Date;
  yearPriorDate: Date;
  yearPriorLastMonth: Date;
  facilityEnergyUnit: string;
  constructor(private facilityDbService: FacilitydbService, private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      if (val) {
        this.facilityEnergyUnit = val.energyUnit;
      }
    })

    this.utilityUsageSummaryDataSub = this.facilityOverviewService.energyUtilityUsageSummaryData.subscribe(val => {
      this.utilityUsageSummaryData = val;
      if (this.utilityUsageSummaryData.total && this.utilityUsageSummaryData.allMetersLastBill) {
        this.lastMonthsDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue + 1);
        this.yearPriorLastMonth = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue);
      }
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.utilityUsageSummaryDataSub.unsubscribe();
  }
}

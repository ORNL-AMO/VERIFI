import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityUsageSummaryData } from 'src/app/models/dashboard';
import { IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';
import { DashboardService } from '../../dashboard.service';

@Component({
  selector: 'app-account-utility-energy-use-table',
  templateUrl: './account-utility-energy-use-table.component.html',
  styleUrls: ['./account-utility-energy-use-table.component.css']
})
export class AccountUtilityEnergyUseTableComponent implements OnInit {

  selectedAccountSub: Subscription;
  accountEnergyUnit: string;

  accountMeterDataSub: Subscription;
  accountMeterData: Array<IdbUtilityMeterData>;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  utilityUsageSummaryData: UtilityUsageSummaryData;
  lastMonthsDate: Date;
  yearPriorLastMonth: Date;
  yearPriorDate: Date;

  constructor(private dashboardService: DashboardService, private utilityMeterDataDbService: UtilityMeterDatadbService, private facilityDbService: FacilitydbService,
    private accountdbService: AccountdbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(val => {
      if (val) {
        this.accountEnergyUnit = val.energyUnit;
      }
    });

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      if (val && val.length != 0) {
        this.setUsageValues();
      } else {
        this.utilityUsageSummaryData = {
          utilitySummaries: new Array(),
          total: {
            lastBillDate: undefined,
            previousMonthEnergyUse: 0,
            previousMonthEnergyCost: 0,
            previousMonthEmissions: 0,
            averageEnergyUse: 0,
            averageEnergyCost: 0,
            averageEmissions: 0,
            utility: undefined,
            yearPriorEnergyCost: 0,
            yearPriorEnergyUse: 0,
            yearPriorEmissions: 0,
            energyUseChangeSinceLastYear: 0,
            energyCostChangeSinceLastYear: 0,
            emissionsChangeSinceLastYear: 0
          },
          allMetersLastBill: undefined
        }
      }
    });
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }

  setUsageValues() {
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.utilityUsageSummaryData = this.dashboardService.getFacilitiesUtilityUsageSummaryData(accountFacilities, true);
    if (this.utilityUsageSummaryData.allMetersLastBill) {
      this.lastMonthsDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue);
      this.yearPriorDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue + 1);
      this.yearPriorLastMonth = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue );
    }
  }
}

import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityUsageSummaryData } from 'src/app/models/dashboard';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-utility-consumption-table',
  templateUrl: './utility-consumption-table.component.html',
  styleUrls: ['./utility-consumption-table.component.css']
})
export class UtilityConsumptionTableComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  facilityId: string;

  energyUnit: string;
  waterUnit: string;

  utilityUsageSummaryData: UtilityUsageSummaryData;
  utilityUsageSummaryDataSub: Subscription;
  lastMonthsDate: Date;
  yearPriorLastMonth: Date;
  yearPriorDate: Date;
  emissionsDisplay: "market" | "location";
  emissionsDisplaySub: Subscription;
  constructor(private accountdbService: AccountdbService, private accountOverviewService: AccountOverviewService,
    private facilityDbService: FacilitydbService, private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.setUnits();

    if (!this.facilityId) {
      //ACCOUNT
      this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
      });

      if (this.dataType == 'energyUse' || this.dataType == 'emissions') {
        this.utilityUsageSummaryDataSub = this.accountOverviewService.energyUtilityUsageSummaryData.subscribe(accountFacilitiesSummary => {
          this.utilityUsageSummaryData = accountFacilitiesSummary;
          this.setDates();

        });
      } else if (this.dataType == 'cost') {
        this.utilityUsageSummaryDataSub = this.accountOverviewService.costsUtilityUsageSummaryData.subscribe(accountFacilitiesSummary => {
          this.utilityUsageSummaryData = accountFacilitiesSummary;
          this.setDates();
        });
      } else if (this.dataType == 'water') {
        this.utilityUsageSummaryDataSub = this.accountOverviewService.waterUtilityUsageSummaryData.subscribe(accountFacilitiesSummary => {
          this.utilityUsageSummaryData = accountFacilitiesSummary;
          this.setDates();
        });
      }
    } else {
      //FACILITY
      this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
      });

      if (this.dataType == 'energyUse' || this.dataType == 'emissions') {
        this.utilityUsageSummaryDataSub = this.facilityOverviewService.energyUtilityUsageSummaryData.subscribe(accountFacilitiesSummary => {
          this.utilityUsageSummaryData = accountFacilitiesSummary;
          this.setDates();

        });
      } else if (this.dataType == 'cost') {
        this.utilityUsageSummaryDataSub = this.facilityOverviewService.costsUtilityUsageSummaryData.subscribe(accountFacilitiesSummary => {
          this.utilityUsageSummaryData = accountFacilitiesSummary;
          this.setDates();
        });
      } else if (this.dataType == 'water') {
        this.utilityUsageSummaryDataSub = this.facilityOverviewService.waterUtilityUsageSummaryData.subscribe(accountFacilitiesSummary => {
          this.utilityUsageSummaryData = accountFacilitiesSummary;
          this.setDates();
        });
      }

    }
  }

  ngOnDestroy() {
    this.utilityUsageSummaryDataSub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
  }

  setDates() {
    if (this.utilityUsageSummaryData && this.utilityUsageSummaryData.allMetersLastBill) {
      this.lastMonthsDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue);
      this.yearPriorDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue + 1);
      this.yearPriorLastMonth = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue);
    } else {
      this.lastMonthsDate = undefined;
      this.yearPriorDate = undefined;
      this.yearPriorLastMonth = undefined;
    }
  }

  setUnits() {
    if (this.facilityId) {
      let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      let selectedFacility: IdbFacility = facilities.find(facility => { return facility.guid == this.facilityId });
      this.energyUnit = selectedFacility.energyUnit;
      this.waterUnit = selectedFacility.volumeLiquidUnit;
    } else {
      let selectedAccount: IdbAccount = this.accountdbService.selectedAccount.getValue();
      this.energyUnit = selectedAccount.energyUnit;
      this.waterUnit = selectedAccount.volumeLiquidUnit;
    }
  }


}

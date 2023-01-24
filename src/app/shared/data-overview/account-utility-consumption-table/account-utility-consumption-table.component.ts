import { Component, ElementRef, ViewChild, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityUsageSummaryData } from 'src/app/models/dashboard';


@Component({
  selector: 'app-account-utility-consumption-table',
  templateUrl: './account-utility-consumption-table.component.html',
  styleUrls: ['./account-utility-consumption-table.component.css']
})
export class AccountUtilityConsumptionTableComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';

  selectedAccountSub: Subscription;
  accountEnergyUnit: string;
  accountWaterUnit: string;

  utilityUsageSummaryData: UtilityUsageSummaryData;
  accountUtilityUsageSummaryDataSub: Subscription;
  lastMonthsDate: Date;
  yearPriorLastMonth: Date;
  yearPriorDate: Date;
  emissionsDisplay: "market" | "location";
  emissionsDisplaySub: Subscription;
  constructor(private accountdbService: AccountdbService, private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
    });


    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(val => {
      if (val) {
        this.accountEnergyUnit = val.energyUnit;
        this.accountWaterUnit = val.volumeLiquidUnit;
      }
    });
    if (this.dataType == 'energyUse' || this.dataType == 'emissions') {
      this.accountUtilityUsageSummaryDataSub = this.accountOverviewService.energyUtilityUsageSummaryData.subscribe(accountFacilitiesSummary => {
        this.utilityUsageSummaryData = accountFacilitiesSummary;
        this.setDates();

      });
    } else if (this.dataType == 'cost') {
      this.accountUtilityUsageSummaryDataSub = this.accountOverviewService.costsUtilityUsageSummaryData.subscribe(accountFacilitiesSummary => {
        this.utilityUsageSummaryData = accountFacilitiesSummary;
        this.setDates();
      });
    } else if (this.dataType == 'water') {
      this.accountUtilityUsageSummaryDataSub = this.accountOverviewService.waterUtilityUsageSummaryData.subscribe(accountFacilitiesSummary => {
        this.utilityUsageSummaryData = accountFacilitiesSummary;
        this.setDates();
      });
    }

  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.accountUtilityUsageSummaryDataSub.unsubscribe();
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


}

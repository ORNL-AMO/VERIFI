import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { UtilityUsageSummaryData } from 'src/app/models/dashboard';

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
  @Input()
  utilityUsageSummaryData: UtilityUsageSummaryData;
  @Input()
  energyUnit: string;
  @Input()
  waterUnit: string;

  lastMonthsDate: Date;
  yearPriorLastMonth: Date;
  yearPriorDate: Date;
  emissionsDisplay: "market" | "location";
  emissionsDisplaySub: Subscription;
  constructor(private accountOverviewService: AccountOverviewService, private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.setDates();
    if (this.dataType == 'emissions') {
      if (!this.facilityId) {
        //ACCOUNT
        this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
          this.emissionsDisplay = val;
        });

      } else {
        //FACILITY
        this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
          this.emissionsDisplay = val;
        });
      }
    }
  }

  ngOnDestroy() {
    if (this.emissionsDisplaySub) {
      this.emissionsDisplaySub.unsubscribe();
    }
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

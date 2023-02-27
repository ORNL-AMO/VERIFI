import { Component, Input } from '@angular/core';
import { IUseAndCost, UseAndCost } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { Subscription } from 'rxjs';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';

@Component({
  selector: 'app-emissions-consumption-table',
  templateUrl: './emissions-consumption-table.component.html',
  styleUrls: ['./emissions-consumption-table.component.css']
})
export class EmissionsConsumptionTableComponent {
  @Input()
  facilityId: string;
  @Input()
  sourcesUseAndCost: Array<UseAndCost>;
  @Input()
  useAndCostTotal: {
      average: IUseAndCost;
      end: IUseAndCost
      previousYear: IUseAndCost;
  };
  @Input()
  dateRange: {startDate: Date, endDate: Date};
  @Input()
  previousYear: Date;

  
  emissionsDisplay: "market" | "location";
  emissionsDisplaySub: Subscription;
  constructor(private accountOverviewService: AccountOverviewService, private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
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

  ngOnDestroy() {
    if (this.emissionsDisplaySub) {
      this.emissionsDisplaySub.unsubscribe();
    }
  }
}

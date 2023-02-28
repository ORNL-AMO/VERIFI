import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { AccountOverviewData, AccountOverviewFacility } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbFacility } from 'src/app/models/idb';
@Component({
  selector: 'app-facilities-usage-table',
  templateUrl: './facilities-usage-table.component.html',
  styleUrls: ['./facilities-usage-table.component.css']
})
export class FacilitiesUsageTableComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  accountFacilitiesSummary: AccountFacilitiesSummary;
  @Input()
  energyUnit: string;
  @Input()
  waterUnit: string;
  @Input()
  accountOverviewFacilities: Array<AccountOverviewFacility>;
  @Input()
  accountOverviewData: AccountOverviewData;




  selectedAccountSub: Subscription;
  accountFacilitiesSummarySub: Subscription;

  emissionsDisplay: "market" | "location";
  emissionsDisplaySub: Subscription;

  orderByField: 'totalUsage' | 'totalMarketEmissions' | 'totalLocationEmissions' | 'totalCost';


  constructor(private router: Router, private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    if (this.dataType == 'emissions') {
      this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
        this.setOrderBy();
      });
    } else {
      this.setOrderBy();
    }
  }

  ngOnDestroy() {
    if (this.emissionsDisplaySub) {
      this.emissionsDisplaySub.unsubscribe();
    }
  }

  selectFacility(facility: IdbFacility) {
    this.router.navigateByUrl('facility/' + facility.id);
  }

  setOrderBy() {
    if (this.dataType == 'cost') {
      this.orderByField = 'totalCost';
    } else if (this.dataType == 'emissions') {
      if (this.emissionsDisplay == 'location') {
        this.orderByField = 'totalLocationEmissions';
      } else {
        this.orderByField = 'totalMarketEmissions';
      }
    } else {
      this.orderByField = 'totalUsage';
    }
  }
}

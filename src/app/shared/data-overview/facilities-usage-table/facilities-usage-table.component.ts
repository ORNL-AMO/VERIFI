import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
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


  selectedAccountSub: Subscription;
  accountEnergyUnit: string;
  waterUnit: string;
  accountFacilitiesSummary: AccountFacilitiesSummary;
  accountFacilitiesSummarySub: Subscription;

  emissionsDisplay: "market" | "location";
  emissionsDisplaySub: Subscription;
  constructor(private router: Router, private accountOverviewService: AccountOverviewService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
    });

    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      if (val) {
        this.accountEnergyUnit = val.energyUnit;
        this.waterUnit = val.volumeLiquidUnit;
      }
    });
    if (this.dataType == 'energyUse' || this.dataType == 'emissions') {
      this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesEnergySummary.subscribe(accountFacilitiesSummary => {
        this.accountFacilitiesSummary = accountFacilitiesSummary;

      });
    } else if (this.dataType == 'cost') {
      this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesCostsSummary.subscribe(accountFacilitiesSummary => {
        this.accountFacilitiesSummary = accountFacilitiesSummary;
      });
    } else if (this.dataType == 'water') {
      this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesWaterSummary.subscribe(accountFacilitiesSummary => {
        this.accountFacilitiesSummary = accountFacilitiesSummary;
      });
    }
  }

  ngOnDestroy() {
    this.accountFacilitiesSummarySub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
  }

  selectFacility(facility: IdbFacility) {
    this.router.navigateByUrl('facility/' + facility.id);
  }
}

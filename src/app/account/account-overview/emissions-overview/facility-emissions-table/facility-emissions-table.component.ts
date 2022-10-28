import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbFacility } from 'src/app/models/idb';
import { AccountOverviewService } from '../../account-overview.service';

@Component({
  selector: 'app-facility-emissions-table',
  templateUrl: './facility-emissions-table.component.html',
  styleUrls: ['./facility-emissions-table.component.css']
})
export class FacilityEmissionsTableComponent implements OnInit {

  selectedAccountSub: Subscription;
  accountEnergyUnit: string;
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
      }
    });
    this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesEnergySummary.subscribe(val => {
      this.accountFacilitiesSummary = val;
    });
  }

  ngOnDestroy() {
    this.emissionsDisplaySub.unsubscribe();
    this.accountFacilitiesSummarySub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }

  selectFacility(facility: IdbFacility) {
    this.router.navigateByUrl('facility/' + facility.id);
  }

}

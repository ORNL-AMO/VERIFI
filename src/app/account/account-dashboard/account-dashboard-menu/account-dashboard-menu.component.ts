import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from 'src/app/shared/helper-services/dashboard.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-account-dashboard-menu',
  templateUrl: './account-dashboard-menu.component.html',
  styleUrls: ['./account-dashboard-menu.component.css']
})
export class AccountDashboardMenuComponent implements OnInit {

  graphDisplay: "cost" | "usage" | "emissions";
  graphDisplaySub: Subscription;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  modalOpen: boolean;
  modalOpenSub: Subscription;
  emissionsDisplay: "location" | "market";
  emissionsDisplaySub: Subscription;
  constructor(private dashboardService: DashboardService,
    private accountDbService: AccountdbService,
    private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
    });
    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(val => {
      this.graphDisplay = val;
    });

    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });

    this.emissionsDisplaySub = this.dashboardService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
    })
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.graphDisplaySub.unsubscribe();
    this.modalOpenSub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
  }

  setGraphDisplay(str: "cost" | "usage" | "emissions") {
    this.dashboardService.graphDisplay.next(str);
  }

  async setAccountEnergyIsSource(energyIsSource: boolean) {
    if (this.selectedAccount.energyIsSource != energyIsSource) {
      this.selectedAccount.energyIsSource = energyIsSource;
      let allAccounts: Array<IdbAccount> = await this.accountDbService.updateWithObservable(this.selectedAccount).toPromise();
      this.accountDbService.allAccounts.next(allAccounts);
      this.accountDbService.selectedAccount.next(this.selectedAccount);
    }
  }

  setEmissions(str: "location" | "market"){
    this.dashboardService.emissionsDisplay.next(str);
  }
}

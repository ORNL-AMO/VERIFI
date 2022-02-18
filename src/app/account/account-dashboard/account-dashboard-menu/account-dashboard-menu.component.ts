import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from 'src/app/shared/helper-services/dashboard.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';

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
  constructor(private dashboardService: DashboardService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
    });
    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(val => {
      this.graphDisplay = val;
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.graphDisplaySub.unsubscribe();
  }

  setGraphDisplay(str: "cost" | "usage" | "emissions") {
    this.dashboardService.graphDisplay.next(str);
  }

  setAccountEnergyIsSource(energyIsSource: boolean) {
    this.selectedAccount.energyIsSource = energyIsSource;
    this.accountDbService.update(this.selectedAccount);
  }
}

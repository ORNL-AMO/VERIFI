import { Component, OnInit } from '@angular/core';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount, IdbUtilityMeter } from 'src/app/models/idb';
import { NavigationEnd, Router } from '@angular/router';
import { AccountOverviewService } from '../account-overview.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';

@Component({
  selector: 'app-account-overview-banner',
  templateUrl: './account-overview-banner.component.html',
  styleUrls: ['./account-overview-banner.component.css']
})
export class AccountOverviewBannerComponent implements OnInit {

  modalOpenSub: Subscription;
  modalOpen: boolean;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  routerSub: Subscription;
  urlDisplay: 'energy' | 'emissions' | 'other';
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
  showWater: boolean;
  constructor(private sharedDataService: SharedDataService, private accountDbService: AccountdbService,
    private router: Router,
    private accountOverviewService: AccountOverviewService,
    private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
      this.setShowWater();
    });

    this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
    })

    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setUrlString(this.router.url);
      }
    });
    this.setUrlString(this.router.url);
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
    this.routerSub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
  }

  setUrlString(url: string) {
    if (url.includes('energy')) {
      this.urlDisplay = 'energy';
    } else if (url.includes('emissions')) {
      this.urlDisplay = 'emissions';
    } else {
      this.urlDisplay = 'other';
    }
  }


  async setAccountEnergyIsSource(energyIsSource: boolean) {
    if (this.selectedAccount.energyIsSource != energyIsSource) {
      this.selectedAccount.energyIsSource = energyIsSource;
      let updatedAccount: IdbAccount = await this.accountDbService.updateWithObservable(this.selectedAccount).toPromise();
      let allAccounts: Array<IdbAccount> = await this.accountDbService.getAll().toPromise();
      this.accountDbService.allAccounts.next(allAccounts);
      this.accountDbService.selectedAccount.next(this.selectedAccount);
    }
  }


  setEmissions(display: 'market' | 'location') {
    this.accountOverviewService.emissionsDisplay.next(display);
  }

  setShowWater() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let waterMeter: IdbUtilityMeter = accountMeters.find(meter => { return meter.source == 'Water' || meter.source == 'Waste Water' });
    this.showWater = waterMeter != undefined;
  }
}

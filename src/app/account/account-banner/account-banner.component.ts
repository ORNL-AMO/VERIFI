import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';

@Component({
  selector: 'app-account-banner',
  templateUrl: './account-banner.component.html',
  styleUrls: ['./account-banner.component.css']
})
export class AccountBannerComponent implements OnInit {


  label: string;

  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  constructor(private helpPanelService: HelpPanelService, private accountDbService: AccountdbService,
    private router: Router) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.selectedAccount = account;
    });
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setLabel(this.router.url);
      }
    });
    this.setLabel(this.router.url);
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }


  setLabel(url: string) {
    if (this.selectedAccount) {
      if (url.includes('settings')) {
        this.label = this.selectedAccount.name + ' Settings'
      } else if (url.includes('home')) {
        this.label = this.selectedAccount.name + ' Overview'
      }
    }
  }
}

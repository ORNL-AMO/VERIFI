import { Component } from '@angular/core';
import { ActivatedRoute, Data, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { DataManagementService } from '../data-management.service';

@Component({
  selector: 'app-data-management-tabs',
  standalone: false,
  templateUrl: './data-management-tabs.html',
  styleUrl: './data-management-tabs.css'
})
export class DataManagementTabs {

  tabs: Array<DataManagementTab> = []

  routerSub: Subscription;
  addTabSub: Subscription;
  previousUrl: string;
  constructor(private activatedRoute: ActivatedRoute, private router: Router,
    private accountDbService: AccountdbService,
    private dataManagementService: DataManagementService
  ) { }

  ngOnInit() {
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // console.log('navigated to: ' + this.router.url);
        this.setActiveTab(this.router.url);
      }
    });
    this.initializeTabs();

    this.addTabSub = this.dataManagementService.addTab.subscribe((tabUrl) => {
      if (tabUrl) {
        console.log('adding tab: ' + tabUrl);
        let isInTabs: boolean = this.tabs.findIndex(tab => { return tab.route == tabUrl }) > -1;
        if (!isInTabs) {
          let newTab: DataManagementTab = this.getTab(tabUrl);
          this.tabs.push(newTab);
        }
        this.router.navigateByUrl(tabUrl);
        this.dataManagementService.addTab.next(undefined);
      }
    });
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
    this.addTabSub.unsubscribe();
  }

  initializeTabs() {
    let currentTab: DataManagementTab = this.getTab(this.router.url);
    this.tabs = [currentTab];
    this.previousUrl = this.router.url;
  }

  setActiveTab(url: string) {
    console.log('setting active tab: ' + url);
    let isInTabs: boolean = this.tabs.findIndex(tab => { return tab.route == url }) > -1;
    if (!isInTabs) {
      let newTab: DataManagementTab = this.getTab(url);
      //replace current tab
      console.log(newTab);
      let previousTabIndex: number = this.tabs.findIndex(tab => { return tab.route == this.previousUrl });
      this.tabs[previousTabIndex] = newTab;
    }
    this.previousUrl = url;
  }

  getTab(url: string): DataManagementTab {
    if (url.includes('home')) {
      let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      return {
        label: account.name + ' To Do List',
        route: url,
        icon: 'fa  fa-list-check'
      }
    } else if (url.includes('account-setup')) {
      return {
        label: 'Corporate Settings',
        route: url,
        icon: 'fa fa-gear',
      }
    } else if (url.includes('import-data')) {
      return {
        label: 'Data Upload',
        route: url,
        icon: 'fa fa-upload',
      }
    }
  }

  closeTab(tabRoute: string) {
    console.log(tabRoute);
    let modifiedTabs = this.tabs.filter(t => { return t.route != tabRoute });
    console.log(modifiedTabs);
    this.tabs = modifiedTabs;
    //navigate to last tab
    let lastTab: DataManagementTab = this.tabs[0];
    console.log(lastTab.route);
    this.router.navigateByUrl(lastTab.route);
  }
}

export interface DataManagementTab {
  label: string;
  route: string;
  icon: string;
}
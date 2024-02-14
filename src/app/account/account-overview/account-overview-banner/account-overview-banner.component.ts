import { Component, OnInit } from '@angular/core';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { NavigationEnd, Router } from '@angular/router';
import { AccountOverviewService } from '../account-overview.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { Month, Months } from 'src/app/shared/form-data/months';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';

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

  minMonth: number;
  minYear: number;
  maxMonth: number;
  maxYear: number;
  months: Array<Month> = Months;
  years: Array<number>;

  dateRangeSub: Subscription;
  constructor(private sharedDataService: SharedDataService, private accountDbService: AccountdbService,
    private router: Router,
    private accountOverviewService: AccountOverviewService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
      this.setShowWater();
      this.setYears();
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

    this.dateRangeSub = this.accountOverviewService.dateRange.subscribe(dateRange => {
      if (dateRange) {
        this.minMonth = dateRange.startDate.getMonth();
        this.minYear = dateRange.startDate.getFullYear();
        this.maxMonth = dateRange.endDate.getMonth();
        this.maxYear = dateRange.endDate.getFullYear();
      }
    });
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
    this.routerSub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
    this.dateRangeSub.unsubscribe();
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
      let updatedAccount: IdbAccount = await firstValueFrom(this.accountDbService.updateWithObservable(this.selectedAccount));
      let allAccounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
      this.accountDbService.allAccounts.next(allAccounts);
      this.accountDbService.selectedAccount.next(this.selectedAccount);
    }
  }

  setEmissions(display: 'market' | 'location') {
    this.accountOverviewService.emissionsDisplay.next(display);
  }

  setShowWater() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let waterMeter: IdbUtilityMeter = accountMeters.find(meter => { return meter.source == 'Water Intake' || meter.source == 'Water Discharge' });
    this.showWater = waterMeter != undefined;
  }

  createReport() {
    this.sharedDataService.openCreateReportModal.next(true);
  }

  setDate() {
    let startDate: Date = new Date(this.minYear, this.minMonth, 1);
    let endDate: Date = new Date(this.maxYear, this.maxMonth, 1);
    this.accountOverviewService.dateRange.next({
      startDate: startDate,
      endDate: endDate
    });
  }

  setYears() {
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let allYears: Array<number> = accountMeterData.flatMap(meterData => { return new Date(meterData.readDate).getFullYear() });
    allYears = _.uniq(allYears);
    this.years = _.orderBy(allYears, (year) => { return year }, 'desc');
  }
}

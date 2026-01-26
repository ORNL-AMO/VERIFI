import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { Month, Months } from 'src/app/shared/form-data/months';
import { AccountOverviewService } from '../../account-overview.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import * as _ from 'lodash';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';

@Component({
  selector: 'app-account-overview-options',
  standalone: false,
  templateUrl: './account-overview-options.html',
  styleUrl: './account-overview-options.css',
})
export class AccountOverviewOptions {


  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;

  minMonth: number;
  minYear: number;
  maxMonth: number;
  maxYear: number;
  months: Array<Month> = Months;
  years: Array<number>;
  errorMessage: string = '';
  dateRangeSub: Subscription;
  displayMenu: boolean = true;
  constructor(private accountDbService: AccountdbService,
    private accountOverviewService: AccountOverviewService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private dbChangesService: DbChangesService) { }

  ngOnInit() {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
      this.setYears();
    });

    this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
    })

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
    this.selectedAccountSub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
    this.dateRangeSub.unsubscribe();
  }

  async setAccountEnergyIsSource() {
    await this.dbChangesService.updateAccount(this.selectedAccount);
  }

  setEmissions() {
    this.accountOverviewService.emissionsDisplay.next(this.emissionsDisplay);
  }
  //date validation
  setDate() {
    let startDate: Date = new Date(this.minYear, this.minMonth, 1);
    let endDate: Date = new Date(this.maxYear, this.maxMonth, 1);

    // compare start and end date
    if (startDate.getTime() >= endDate.getTime()) {
      this.errorMessage = 'Start date cannot be later than the end date';
      return;
    }

    this.errorMessage = '';

    // Proceed with valid date range
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

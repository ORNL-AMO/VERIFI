import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { Month, Months } from 'src/app/shared/form-data/months';
import { AccountOverviewService } from '../../account-overview.service';
import * as _ from 'lodash';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from 'src/app/account-workspace/handlers/account-command-handler.service';

@Component({
  selector: 'app-account-overview-options',
  standalone: false,
  templateUrl: './account-overview-options.html',
  styleUrl: './account-overview-options.css',
})
export class AccountOverviewOptions {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);


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
  constructor(
    private accountOverviewService: AccountOverviewService,
    private commandBoundary: WorkspaceCommandBoundary,
    private accountHandler: AccountCommandHandler,
    private injector: Injector
  ) { }

  ngOnInit() {
    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(val => {
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
    await this.commandBoundary.execute(
      { entityKind: 'account', changeKind: 'update', entityGuid: this.selectedAccount.guid, label: 'Updating account' ,
        publication: { mode: 'patch', buildPatch: value => ({ account: value }) }},
      () => this.accountHandler.update({ ...this.selectedAccount }, this.selectedAccount.guid)
    );
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
    let accountMeterData: Array<IdbUtilityMeterData> = [...this.accountWorkspaceStore.meterData()];
    let allYears: Array<number> = accountMeterData.flatMap(meterData => { return meterData.year });
    allYears = _.uniq(allYears);
    this.years = _.orderBy(allYears, (year) => { return year }, 'desc');
  }
}

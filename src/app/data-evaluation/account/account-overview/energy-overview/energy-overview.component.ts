import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject, Injector } from '@angular/core';
import { AccountOverviewService } from '../account-overview.service';
import { Subscription } from 'rxjs';
import { AccountOverviewData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { IdbAccount } from 'src/app/models/idbModels/account';
@Component({
  selector: 'app-energy-overview',
  templateUrl: './energy-overview.component.html',
  styleUrls: ['./energy-overview.component.css'],
  standalone: false
})
export class EnergyOverviewComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  calculatingSub: Subscription;
  calculating: boolean | 'error';
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;

  accountOverviewDataSub: Subscription;
  accountOverviewData: AccountOverviewData;
  utilityUseAndCostSub: Subscription;
  utilityUseAndCost: UtilityUseAndCost;
  dateRangeSub: Subscription;
  dateRange: { startDate: Date, endDate: Date };
  constructor(private accountOverviewService: AccountOverviewService, private injector: Injector) { }

  ngOnInit(): void {
    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(val => {
      this.selectedAccount = val;
    });
    this.calculatingSub = this.accountOverviewService.calculating.subscribe(val => {
      this.calculating = val;
    });

    this.dateRangeSub = this.accountOverviewService.dateRange.subscribe(dateRange => {
      this.dateRange = dateRange;
    });

    this.accountOverviewDataSub = this.accountOverviewService.accountOverviewData.subscribe(val => {
      this.accountOverviewData = val;
    });

    this.utilityUseAndCostSub = this.accountOverviewService.utilityUseAndCost.subscribe(val => {
      this.utilityUseAndCost = val;
    });
  }

  ngOnDestroy() {
    this.calculatingSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
    this.accountOverviewDataSub.unsubscribe();
    this.utilityUseAndCostSub.unsubscribe();
    this.dateRangeSub.unsubscribe();
  }

}

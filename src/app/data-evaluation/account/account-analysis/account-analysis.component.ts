import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject, computed, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountAnalysisService } from './account-analysis.service';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { AnalysisService } from '../../facility/analysis/analysis.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
    selector: 'app-account-analysis',
    templateUrl: './account-analysis.component.html',
    styleUrls: ['./account-analysis.component.css'],
    standalone: false
})
export class AccountAnalysisComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  utilityMeterDataSub: Subscription;
  utilityMeterData: Array<IdbUtilityMeterData>;
  monthlyKey: string;
  annualKey: string;
  account: IdbAccount;
  accountSub: Subscription;
  constructor(
    private accountAnalysisService: AccountAnalysisService,
    private analysisService: AnalysisService,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.utilityMeterDataSub = toObservable(computed(() => [...this.accountWorkspaceStore.meterData()]), { injector: this.injector }).subscribe(val => {
      this.utilityMeterData = val;
    });
    this.accountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(val => {
      this.account = val;
      this.annualKey = 'annual-' + this.account?.id;
      this.monthlyKey = 'monthly-' + this.account?.id;
    });
  }

  ngOnDestroy() {
    this.utilityMeterDataSub.unsubscribe();
    this.accountSub.unsubscribe();
    this.accountAnalysisService.hideInUseMessage.next(false);
    this.analysisService.getDisplaySubject(this.annualKey, 'table').next('table');
    this.analysisService.getDisplaySubject(this.monthlyKey, 'graph').next('graph');
  }

}

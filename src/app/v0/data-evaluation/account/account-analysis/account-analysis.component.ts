import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, OnInit, inject, computed, Injector, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { RouterOutlet } from '@angular/router';
import { AccountAnalysisService } from '@v0/data-evaluation/account/account-analysis/account-analysis.service';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { IdbAccount } from '@data/models/idbModels/account';

@Component({
    selector: 'app-account-analysis',
    templateUrl: './account-analysis.component.html',
    styleUrls: ['./account-analysis.component.css'],
    standalone: false
})
export class AccountAnalysisComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  @ViewChild(RouterOutlet) private routedContent?: RouterOutlet;

  readonly beforeNavigate = (): Promise<boolean> => {
    const editor = this.routedContent?.isActivated
      ? this.routedContent.component as { canDeactivate?: () => Promise<boolean> }
      : undefined;
    return editor?.canDeactivate?.() ?? Promise.resolve(true);
  };

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

import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { AccountAnalysisService } from '../../account-analysis.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Component({
    selector: 'app-monthly-account-analysis',
    templateUrl: './monthly-account-analysis.component.html',
    styleUrls: ['./monthly-account-analysis.component.css'],
    standalone: false
})
export class MonthlyAccountAnalysisComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  monthlyAccountAnalysisData: Array<MonthlyAnalysisSummaryData>;
  accountAnalysisItem: IdbAccountAnalysisItem;
  account: IdbAccount;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  calculating: boolean | 'error';

  calculatingSub: Subscription;
  monthlyAccountAnalysisDataSub: Subscription;
  analysisDisplay: 'table' | 'graph';
  key: string;
  accountSub: Subscription;

  constructor(
    private analysisService: AnalysisService,
    private accountAnalysisService: AccountAnalysisService,
    private sharedDataService: SharedDataService,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.accountAnalysisItem = this.accountWorkspaceStore.selectedAccountAnalysis();

    this.accountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(val => {
      this.account = val;
      this.key = 'monthly-' + this.account?.id;
      this.analysisDisplay = this.analysisService.getDisplaySubject(this.key, 'graph').getValue();
    });

    this.calculatingSub = this.accountAnalysisService.calculating.subscribe(val => {
      this.calculating = val;
    });

    this.monthlyAccountAnalysisDataSub = this.accountAnalysisService.monthlyAccountAnalysisData.subscribe(val => {
      this.monthlyAccountAnalysisData = val;
    });

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy(){
    this.calculatingSub.unsubscribe();
    this.monthlyAccountAnalysisDataSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
    this.accountSub.unsubscribe();
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.analysisDisplay = display;
    this.analysisService.getDisplaySubject(this.key, 'graph').next(this.analysisDisplay);
  }
}

import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { AccountAnalysisService } from '../../account-analysis.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Component({
    selector: 'app-annual-account-analysis',
    templateUrl: './annual-account-analysis.component.html',
    styleUrls: ['./annual-account-analysis.component.css'],
    standalone: false
})
export class AnnualAccountAnalysisComponent implements OnInit {

  accountAnalysisItem: IdbAccountAnalysisItem;
  account: IdbAccount;
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  calculating: boolean | 'error';
  calculatingSub: Subscription;
  annualAnalysisSummarySub: Subscription;
  analysisDisplay: 'table' | 'graph';
  key: string;
  accountSub: Subscription;

  constructor(private analysisService: AnalysisService,
    private accountAnalysisDbService: AccountAnalysisDbService, private accountDbService: AccountdbService,
    private accountAnalysisService: AccountAnalysisService) { }

  ngOnInit(): void {
    this.accountAnalysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();

    this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val;
      this.key = 'annual-' + this.account?.id;
      this.analysisDisplay = this.analysisService.getDisplaySubject(this.key, 'table').getValue();
    });

    this.annualAnalysisSummarySub = this.accountAnalysisService.annualAnalysisSummary.subscribe(val => {
      this.annualAnalysisSummary = val;
    });
    this.calculatingSub = this.accountAnalysisService.calculating.subscribe(val => {
      this.calculating = val;
    })

  }

  ngOnDestroy() {
    this.calculatingSub.unsubscribe();
    this.annualAnalysisSummarySub.unsubscribe();
    this.accountSub.unsubscribe();
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.analysisDisplay = display;
    this.analysisService.getDisplaySubject(this.key, 'table').next(this.analysisDisplay);
  }
}

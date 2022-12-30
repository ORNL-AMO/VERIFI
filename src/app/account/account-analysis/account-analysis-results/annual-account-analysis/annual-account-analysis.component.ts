import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAccount, IdbAccountAnalysisItem } from 'src/app/models/idb';
import { AccountAnalysisService } from '../../account-analysis.service';

@Component({
  selector: 'app-annual-account-analysis',
  templateUrl: './annual-account-analysis.component.html',
  styleUrls: ['./annual-account-analysis.component.css']
})
export class AnnualAccountAnalysisComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  accountAnalysisItem: IdbAccountAnalysisItem;
  account: IdbAccount;
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  worker: Worker;
  calculating: boolean;
  calculatingSub: Subscription;
  annualAnalysisSummarySub: Subscription;
  constructor(private analysisService: AnalysisService,
    private accountAnalysisDbService: AccountAnalysisDbService, private accountDbService: AccountdbService,
    private accountAnalysisService: AccountAnalysisService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.accountAnalysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();
    this.account = this.accountDbService.selectedAccount.getValue();

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
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}

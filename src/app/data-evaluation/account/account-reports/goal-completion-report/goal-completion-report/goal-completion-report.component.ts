import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
  selector: 'app-goal-completion-report',
  standalone: false,

  templateUrl: './goal-completion-report.component.html',
  styleUrl: './goal-completion-report.component.css'
})
export class GoalCompletionReportComponent {
  selectedReport: IdbAccountReport;
  printSub: Subscription;
  print: boolean;
  account: IdbAccount;
  selectedAnalysisItem: IdbAccountAnalysisItem;

  constructor(private accountReportDbService: AccountReportDbService,
    private router: Router, private accountDbService: AccountdbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private dataEvaluationService: DataEvaluationService) { }

  ngOnInit(): void {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });

    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/data-evaluation/account/reports/dashboard');
    }
    this.account = this.accountDbService.selectedAccount.getValue();
    this.setAnalysisItem();
  }

  ngOnDestroy() {
    this.printSub.unsubscribe();
  }

  setAnalysisItem() {
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    let selectedAnalysisItem: IdbAccountAnalysisItem = accountAnalysisItems.find(item => { return item.guid == this.selectedReport.goalCompletionReportSetup.analysisItemId });
    this.selectedAnalysisItem = JSON.parse(JSON.stringify(selectedAnalysisItem));
  }
}

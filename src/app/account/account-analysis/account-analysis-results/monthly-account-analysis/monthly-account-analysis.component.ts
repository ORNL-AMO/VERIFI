import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAccount, IdbAccountAnalysisItem } from 'src/app/models/idb';
import { AccountAnalysisCalculationsService } from 'src/app/shared/shared-analysis/calculations/account-analysis-calculations.service';

@Component({
  selector: 'app-monthly-account-analysis',
  templateUrl: './monthly-account-analysis.component.html',
  styleUrls: ['./monthly-account-analysis.component.css']
})
export class MonthlyAccountAnalysisComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  monthlyAccountAnalysisData: Array<MonthlyAnalysisSummaryData>;
  accountAnalysisItem: IdbAccountAnalysisItem;
  account: IdbAccount;
  itemsPerPage: number = 12;
  constructor(private analysisService: AnalysisService, private accountAnalysisCalculationsService: AccountAnalysisCalculationsService,
    private accoundAnalysisDbService: AccountAnalysisDbService, private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.accountAnalysisItem = this.accoundAnalysisDbService.selectedAnalysisItem.getValue();
    this.account = this.accountDbService.selectedAccount.getValue();
    this.monthlyAccountAnalysisData = this.accountAnalysisCalculationsService.calculateMonthlyAccountAnalysis(this.accountAnalysisItem, this.account);
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}

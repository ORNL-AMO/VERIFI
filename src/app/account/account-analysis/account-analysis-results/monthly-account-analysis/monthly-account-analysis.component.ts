import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountAnalysisItem } from 'src/app/models/idb';
import { AccountAnalysisCalculationsService } from 'src/app/shared/shared-analysis/calculations/account-analysis-calculations.service';
import { AccountAnalysisService } from '../../account-analysis.service';

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
    private accoundAnalysisDbService: AccountAnalysisDbService, private accountDbService: AccountdbService,
    private accountAnalysisService: AccountAnalysisService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.accountAnalysisItem = this.accoundAnalysisDbService.selectedAnalysisItem.getValue();
    this.account = this.accountDbService.selectedAccount.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.accountAnalysisService.calanderizedMeters;
    this.monthlyAccountAnalysisData = this.accountAnalysisCalculationsService.calculateMonthlyAccountAnalysis(this.accountAnalysisItem, this.account, calanderizedMeters);
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}

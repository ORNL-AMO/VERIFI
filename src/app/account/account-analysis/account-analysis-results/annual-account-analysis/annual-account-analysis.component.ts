import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountAnalysisItem } from 'src/app/models/idb';
import { AccountAnalysisCalculationsService } from 'src/app/shared/shared-analysis/calculations/account-analysis-calculations.service';
import { AccountAnalysisService } from '../../account-analysis.service';

@Component({
  selector: 'app-annual-account-analysis',
  templateUrl: './annual-account-analysis.component.html',
  styleUrls: ['./annual-account-analysis.component.css']
})
export class AnnualAccountAnalysisComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  analysisItem: IdbAccountAnalysisItem;
  account: IdbAccount;
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  constructor(private analysisService: AnalysisService, private accountAnalysisCalculationsService: AccountAnalysisCalculationsService,
    private accountAnalysisDbService: AccountAnalysisDbService, private accountDbService: AccountdbService,
    private accountAnalysisService: AccountAnalysisService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();
    this.account = this.accountDbService.selectedAccount.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.accountAnalysisService.calanderizedMeters;
    this.annualAnalysisSummary = this.accountAnalysisCalculationsService.getAnnualAnalysisSummary(this.analysisItem, this.account, calanderizedMeters);
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}

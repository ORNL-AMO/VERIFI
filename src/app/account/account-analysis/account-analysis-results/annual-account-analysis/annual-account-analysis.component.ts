import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
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
  constructor(private analysisService: AnalysisService,
    private accountAnalysisDbService: AccountAnalysisDbService, private accountDbService: AccountdbService,
    private accountAnalysisService: AccountAnalysisService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private analysisDbService: AnalysisDbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.accountAnalysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();
    this.account = this.accountDbService.selectedAccount.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.accountAnalysisService.calanderizedMeters;
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();

    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/annual-account-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.annualAnalysisSummary = data;
        this.calculating = false;
        this.worker.terminate();
      };
      this.calculating = true;
      this.worker.postMessage({
        accountAnalysisItem: this.accountAnalysisItem,
        account: this.account,
        calanderizedMeters: calanderizedMeters,
        accountFacilities: accountFacilities,
        accountPredictorEntries: accountPredictorEntries,
        allAccountAnalysisItems: accountAnalysisItems
      });
    } else {
      console.log('nopee')

      // Web Workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
    }
  }

  ngOnDestroy(){
    if(this.worker){
      this.worker.terminate();
    }
  }
  
  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}

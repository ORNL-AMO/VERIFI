import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
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
  worker: Worker;
  calculating: boolean;
  constructor(private analysisService: AnalysisService, private accountAnalysisCalculationsService: AccountAnalysisCalculationsService,
    private accoundAnalysisDbService: AccountAnalysisDbService, private accountDbService: AccountdbService,
    private accountAnalysisService: AccountAnalysisService,
    private predictorDbService: PredictordbService,
    private facilityDbService: FacilitydbService,
    private analysisDbService: AnalysisDbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.accountAnalysisItem = this.accoundAnalysisDbService.selectedAnalysisItem.getValue();
    this.account = this.accountDbService.selectedAccount.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.accountAnalysisService.calanderizedMeters;
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();

    // this.monthlyAccountAnalysisData = this.accountAnalysisCalculationsService.calculateMonthlyAccountAnalysis(this.accountAnalysisItem, this.account, calanderizedMeters);
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/monthly-account-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.monthlyAccountAnalysisData = data;
        this.calculating = false;
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

import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { WebWorkerService, WorkerRequest } from 'src/app/web-workers/web-worker.service';
import { AccountAnalysisService } from '../account-analysis.service';

@Component({
  selector: 'app-account-analysis-results',
  templateUrl: './account-analysis-results.component.html',
  styleUrls: ['./account-analysis-results.component.css']
})
export class AccountAnalysisResultsComponent implements OnInit {

  accountAnalysisItem: IdbAccountAnalysisItem;
  account: IdbAccount;
  resultsSub: Subscription;
  constructor(private accountAnalysisService: AccountAnalysisService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private analysisDbService: AnalysisDbService,
    private webWorkerService: WebWorkerService) { }

  ngOnInit(): void {
    this.accountAnalysisService.setCalanderizedMeters();
    this.accountAnalysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();
    this.account = this.accountDbService.selectedAccount.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.accountAnalysisService.calanderizedMeters;
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();

    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();

    let workerAnnualRequest: WorkerRequest = {
      type: 'annualAccountAnalysis',
      id: this.webWorkerService.getID(),
      results: undefined,
      input: {
        accountAnalysisItem: this.accountAnalysisItem,
        account: this.account,
        calanderizedMeters: calanderizedMeters,
        accountPredictorEntries: accountPredictorEntries,
        accountFacilities: accountFacilities,
        accountAnalysisItems: accountAnalysisItems
      }
    }


    this.resultsSub = this.webWorkerService.workerResults.subscribe(val => {
      if (val && val.id == workerAnnualRequest.id) {
        this.accountAnalysisService.annualAnalysisSummary.next(val.results.annualAnalysisSummary);
        this.accountAnalysisService.monthlyAccountAnalysisData.next(val.results.monthlyAnalysisSummaryData);
        this.accountAnalysisService.calculating.next(false);
      }
    });

    this.accountAnalysisService.calculating.next(true);
    this.webWorkerService.addRequest(workerAnnualRequest);

  }

  ngOnDestroy() {
    if (this.resultsSub) {
      this.resultsSub.unsubscribe();
    }
  }
}

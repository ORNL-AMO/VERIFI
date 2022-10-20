import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { AnnualAccountAnalysisWASM } from 'src/app/web-workers/classes/wasm-api/annualAccountAnalysisWASM';
import { MonthlyAccountAnalysisWASM } from 'src/app/web-workers/classes/wasm-api/monthlyAccountAnalysisWASM';
import { WebWorkerService, WorkerRequest } from 'src/app/web-workers/web-worker.service';
import { AccountAnalysisService } from '../account-analysis.service';
declare var Module: any;

@Component({
  selector: 'app-account-analysis-results',
  templateUrl: './account-analysis-results.component.html',
  styleUrls: ['./account-analysis-results.component.css']
})
export class AccountAnalysisResultsComponent implements OnInit {

  accountAnalysisItem: IdbAccountAnalysisItem;
  account: IdbAccount;
  worker: Worker;
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
    // let calanderizedMeters: Array<CalanderizedMeter> = this.accountAnalysisService.calanderizedMeters;
    // let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();


    // let workerMonthlyRequest: WorkerRequest = {
    //   type: 'monthlyAccountAnalysis',
    //   id: this.webWorkerService.getID(),
    //   results: undefined,
    //   input: {
    //     accountAnalysisItem: this.accountAnalysisItem,
    //     account: this.account,
    //     calanderizedMeters: calanderizedMeters,
    //     accountPredictorEntries: accountPredictorEntries,
    //     accountFacilities: accountFacilities,
    //     accountAnalysisItems: accountAnalysisItems
    //   }
    // }

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
      // if (val && val.id == workerMonthlyRequest.id) {
      //   this.accountAnalysisService.monthlyAccountAnalysisData.next(val.results);
      //   this.accountAnalysisService.calculatingMonthly.next(false);
      // }
      if (val && val.id == workerAnnualRequest.id) {
        this.accountAnalysisService.annualAnalysisSummary.next(val.results.annualAnalysisSummary);
        this.accountAnalysisService.monthlyAccountAnalysisData.next(val.results.monthlyAnalysisSummaryData);
        this.accountAnalysisService.calculating.next(false);
      }
    });

    this.accountAnalysisService.calculating.next(true);
    this.webWorkerService.addRequest(workerAnnualRequest);

    // this.accountAnalysisService.calculatingMonthly.next(true);
    // this.webWorkerService.addRequest(workerMonthlyRequest);




    // let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    // let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    // if (typeof Worker !== 'undefined') {
    //   this.worker = new Worker(new URL('src/app/web-workers/annual-account-analysis.worker', import.meta.url));
    //   this.worker.onmessage = ({ data }) => {
    //     this.worker.terminate();
    //     this.accountAnalysisService.annualAnalysisSummary.next(data.annualAnalysisSummaries);
    //     this.accountAnalysisService.monthlyAccountAnalysisData.next(data.monthlyAnalysisSummaryData);
    //     this.accountAnalysisService.calculating.next(false);
    //   };
    //   this.accountAnalysisService.calculating.next(true);
    //   this.worker.postMessage({
    //     accountAnalysisItem: this.accountAnalysisItem,
    //     account: this.account,
    //     calanderizedMeters: calanderizedMeters,
    //     accountFacilities: accountFacilities,
    //     accountPredictorEntries: accountPredictorEntries,
    //     allAccountAnalysisItems: accountAnalysisItems
    //   });
    // } else {
    //   console.log('nopee')

    //   // Web Workers are not supported in this environment.
    //   // You should add a fallback so that your program still executes correctly.
    // }
    // this.calculate();
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
    }
  }

  // calculate() {
  //   // this.accountAnalysisService.calculating.next(true)
  //   let calanderizedMeters: Array<CalanderizedMeter> = this.accountAnalysisService.calanderizedMeters;
  //   let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();

  //   let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
  //   let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
  //   // let calanderizedMeters: Array<CalanderizedMeter> = this.analysisService.calanderizedMeters;
  //   // let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
  //   try {
  //     console.time('test');
  //     let test = new MonthlyAccountAnalysisWASM(Module, this.accountAnalysisItem, this.account, accountFacilities, calanderizedMeters, accountPredictorEntries, accountAnalysisItems);
  //     this.accountAnalysisService.monthlyAccountAnalysisData.next(test.monthlyAnalysisSummaryData);
  //     console.timeEnd('test')
  //     console.time('test2');
  //     let test2 = new AnnualAccountAnalysisWASM(Module, this.accountAnalysisItem, this.account, accountFacilities, calanderizedMeters, accountPredictorEntries, accountAnalysisItems);
  //     this.accountAnalysisService.annualAnalysisSummary.next(test2.annualAnalysisSummary);
  //     console.timeEnd('test2');
  //     this.accountAnalysisService.calculating.next(false);
  //     // this.monthlyAnalysisSummary = {
  //     //   predictorVariables: undefined,
  //     //   modelYear: undefined,
  //     //   monthlyAnalysisSummaryData: test.monthlyAnalysisSummaryData
  //     // }
  //     // this.calculating = false;
  //   } catch (err) {
  //     console.log(err)
  //   }
  // }
}

import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { AccountHomeService } from './account-home.service';

@Component({
  selector: 'app-account-home',
  templateUrl: './account-home.component.html',
  styleUrls: ['./account-home.component.css']
})
export class AccountHomeComponent implements OnInit {

  accountFacilities: Array<IdbFacility>;
  accountMeterDataSub: Subscription;
  monthlyAnalysisWorker: Worker;
  annualAnalysisWorker: Worker;
  account: IdbAccount;
  constructor(private facilityDbService: FacilitydbService, private accountDbService: AccountdbService,
    private accountHomeService: AccountHomeService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDbService: PredictordbService,
    private analysisDbService: AnalysisDbService) { }

  ngOnInit(): void {
    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      this.account = this.accountDbService.selectedAccount.getValue();
      this.accountHomeService.setCalanderizedMeters();
      this.accountFacilities = this.facilityDbService.accountFacilities.getValue();
      if (this.accountHomeService.latestAnalysisItem) {
        this.setMonthlyAnalysisSummary();
        this.setAnnualAnalysisSummary();
      } else {
        this.accountHomeService.monthlyFacilityAnalysisData.next(undefined);
        this.accountHomeService.annualAnalysisSummary.next(undefined);
      }
    })
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
    if (this.monthlyAnalysisWorker) {
      this.monthlyAnalysisWorker.terminate();
    }
    if (this.annualAnalysisWorker) {
      this.annualAnalysisWorker.terminate();
    }
    this.accountHomeService.monthlyFacilityAnalysisData.next(undefined);
    this.accountHomeService.annualAnalysisSummary.next(undefined);
  }


  setMonthlyAnalysisSummary() {
    let calanderizedMeters: Array<CalanderizedMeter> = this.accountHomeService.calanderizedMeters;
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    if (typeof Worker !== 'undefined') {
      this.monthlyAnalysisWorker = new Worker(new URL('src/app/web-workers/monthly-account-analysis.worker', import.meta.url));
      this.monthlyAnalysisWorker.onmessage = ({ data }) => {
        this.accountHomeService.monthlyFacilityAnalysisData.next(data);
        this.monthlyAnalysisWorker.terminate();

      };
      this.monthlyAnalysisWorker.postMessage({
        accountAnalysisItem: this.accountHomeService.latestAnalysisItem,
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

  setAnnualAnalysisSummary() {
    let calanderizedMeters: Array<CalanderizedMeter> = this.accountHomeService.calanderizedMeters;
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    if (typeof Worker !== 'undefined') {
      this.annualAnalysisWorker = new Worker(new URL('src/app/web-workers/annual-account-analysis.worker', import.meta.url));
      this.annualAnalysisWorker.onmessage = ({ data }) => {
        this.accountHomeService.annualAnalysisSummary.next(data);
        this.annualAnalysisWorker.terminate();
      };
      this.annualAnalysisWorker.postMessage({
        accountAnalysisItem: this.accountHomeService.latestAnalysisItem,
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

}

import { Component, OnInit } from '@angular/core';
import { AnnualAccountAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualAccountAnalysisSummaryClass';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { AccountAnalysisService } from '../account-analysis.service';

@Component({
  selector: 'app-account-analysis-results',
  templateUrl: './account-analysis-results.component.html',
  styleUrls: ['./account-analysis-results.component.css']
})
export class AccountAnalysisResultsComponent implements OnInit {

  accountAnalysisItem: IdbAccountAnalysisItem;
  account: IdbAccount;
  worker: Worker;
  constructor(private accountAnalysisService: AccountAnalysisService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private analysisDbService: AnalysisDbService) { }

  ngOnInit(): void {
    if (!this.accountAnalysisService.calanderizedMeters) {
      this.accountAnalysisService.setCalanderizedMeters();
    }
    this.accountAnalysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();
    this.account = this.accountDbService.selectedAccount.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = this.accountAnalysisService.calanderizedMeters;
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();

    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/annual-account-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.worker.terminate();
        this.accountAnalysisService.annualAnalysisSummary.next(data.annualAnalysisSummaries);
        this.accountAnalysisService.monthlyAccountAnalysisData.next(data.monthlyAnalysisSummaryData);
        this.accountAnalysisService.calculating.next(false);
      };
      this.accountAnalysisService.calculating.next(true);
      this.worker.postMessage({
        accountAnalysisItem: this.accountAnalysisItem,
        account: this.account,
        calanderizedMeters: calanderizedMeters,
        accountFacilities: accountFacilities,
        accountPredictorEntries: accountPredictorEntries,
        allAccountAnalysisItems: accountAnalysisItems,
        calculateAllMonthlyData: false
      });
    } else {
      // Web Workers are not supported in this environment.
      let annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(this.accountAnalysisItem, this.account, calanderizedMeters, accountFacilities, accountPredictorEntries, accountAnalysisItems, false);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.accountAnalysisService.annualAnalysisSummary.next(annualAnalysisSummaries);
      this.accountAnalysisService.monthlyAccountAnalysisData.next(monthlyAnalysisSummaryData);
    }
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
    }
  }
}

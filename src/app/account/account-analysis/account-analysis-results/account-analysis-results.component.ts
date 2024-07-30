import { Component, OnInit } from '@angular/core';
import { AnnualAccountAnalysisSummaryClass } from 'src/app/calculations/analysis-calculations/annualAccountAnalysisSummaryClass';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { AccountAnalysisService } from '../account-analysis.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';

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
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private analysisDbService: AnalysisDbService,
    private sharedDataService: SharedDataService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.accountAnalysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();
    this.account = this.accountDbService.selectedAccount.getValue();
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();

    let accountPredictorEntries: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();
    let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('src/app/web-workers/annual-account-analysis.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        this.worker.terminate();
        if (!data.error) {
          this.accountAnalysisService.annualAnalysisSummary.next(data.annualAnalysisSummaries);
          this.accountAnalysisService.monthlyAccountAnalysisData.next(data.monthlyAnalysisSummaryData);
          this.accountAnalysisService.facilitySummaries.next(data.facilitySummaries);
          this.accountAnalysisService.calculating.next(false);
        } else {
          this.accountAnalysisService.annualAnalysisSummary.next(undefined);
          this.accountAnalysisService.monthlyAccountAnalysisData.next(undefined);
          this.accountAnalysisService.facilitySummaries.next(undefined);
          this.accountAnalysisService.calculating.next('error');
        }
      };
      this.accountAnalysisService.calculating.next(true);
      this.worker.postMessage({
        accountAnalysisItem: this.accountAnalysisItem,
        account: this.account,
        accountFacilities: accountFacilities,
        accountPredictorEntries: accountPredictorEntries,
        allAccountAnalysisItems: accountAnalysisItems,
        calculateAllMonthlyData: false,
        meters: meters,
        meterData: meterData,
        accountPredictors: accountPredictors
      });
    } else {
      // Web Workers are not supported in this environment.
      let annualAnalysisSummaryClass: AnnualAccountAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(this.accountAnalysisItem, this.account, accountFacilities, accountPredictorEntries, accountAnalysisItems, false, meters, meterData, accountPredictors);
      let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.accountAnalysisService.annualAnalysisSummary.next(annualAnalysisSummaries);
      this.accountAnalysisService.monthlyAccountAnalysisData.next(monthlyAnalysisSummaryData);
      this.accountAnalysisService.facilitySummaries.next(annualAnalysisSummaryClass.facilitySummaries);
      this.accountAnalysisService.calculating.next(false);
    }
  }

  ngOnDestroy() {
    if (this.worker) {
      this.worker.terminate();
    }
  }

  createNewReport() {
    this.sharedDataService.openCreateReportModal.next(true);
  }
}

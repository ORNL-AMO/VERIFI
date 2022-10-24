import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbOverviewReportOptions, IdbPredictorEntry, IdbUtilityMeterData } from 'src/app/models/idb';
import { AccountHomeService } from '../account-home.service';
import * as _ from 'lodash';
import { Router } from '@angular/router';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { ExportToExcelTemplateService } from 'src/app/shared/helper-services/export-to-excel-template.service';
import { WebWorkerService, WorkerRequest } from 'src/app/web-workers/web-worker.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Component({
  selector: 'app-account-home-summary',
  templateUrl: './account-home-summary.component.html',
  styleUrls: ['./account-home-summary.component.css']
})
export class AccountHomeSummaryComponent implements OnInit {

  account: IdbAccount;
  accountSub: Subscription;
  latestAnalysisSummary: AnnualAnalysisSummary;
  latestAnalysisYear: number;
  percentSavings: number = 0;
  percentGoal: number;
  percentTowardsGoal: number = 0;
  goalYear: number;
  baselineYear: number;

  betterPlantsReportYear: number;
  accountAnalysisYear: number;

  overviewReportOptionsSub: Subscription;
  disableButtons: boolean;
  monthlyAccountAnalysisData: Array<MonthlyAnalysisSummaryData>;
  latestAnalysisItem: IdbAccountAnalysisItem;
  calculating: boolean;
  resultsSub: Subscription;
  constructor(private accountDbService: AccountdbService, private accountHomeService: AccountHomeService,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService, private router: Router,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private exportToExcelTemplateService: ExportToExcelTemplateService,
    private webWorkerService: WebWorkerService,
    private predictorDbService: PredictordbService,
    private analysisDbService: AnalysisDbService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val;
      this.setGoalYears();
      this.latestAnalysisItem = this.accountHomeService.latestAnalysisItem;
      let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
      this.disableButtons = (accountMeterData.length == 0);
      this.calculateAnalysis();
    });

    this.overviewReportOptionsSub = this.overviewReportOptionsDbService.accountOverviewReportOptions.subscribe(accountOverviewReportOptions => {
      let betterPlantsReports: Array<IdbOverviewReportOptions> = accountOverviewReportOptions.filter(options => { return options.type == 'report' && options.reportOptionsType == "betterPlants" });
      let latestReport: IdbOverviewReportOptions = _.maxBy(betterPlantsReports, 'targetYear');
      if (latestReport) {
        this.betterPlantsReportYear = latestReport.targetYear;
      } else {
        this.betterPlantsReportYear = undefined;
      }
    });

  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.overviewReportOptionsSub.unsubscribe();
    if (this.resultsSub) {
      this.resultsSub.unsubscribe();
    }
  }

  setGoalYears() {
    if (this.account && this.account.sustainabilityQuestions) {
      this.percentGoal = this.account.sustainabilityQuestions.energyReductionPercent;
      this.goalYear = this.account.sustainabilityQuestions.energyReductionTargetYear;
      this.baselineYear = this.account.sustainabilityQuestions.energyReductionBaselineYear;
    }
  }

  setProgressPercentages() {
    this.percentSavings = this.latestAnalysisSummary.totalSavingsPercentImprovement;
    this.latestAnalysisYear = this.latestAnalysisSummary.year;
    this.percentTowardsGoal = (this.percentSavings / this.percentGoal) * 100;
  }

  navigateTo(urlStr: string) {
    if (urlStr != 'upload') {
      this.router.navigateByUrl('account/' + urlStr);
    } else {
      this.router.navigateByUrl('/' + urlStr);
    }
  }

  exportData() {
    this.exportToExcelTemplateService.exportFacilityData();
  }


  calculateAnalysis() {
    if (this.latestAnalysisItem) {
      let calanderizedMeters: Array<CalanderizedMeter> = this.accountHomeService.calanderizedMeters;
      let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
      let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      let accountAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.accountAnalysisItems.getValue();
      let workerAnnualRequest: WorkerRequest = {
        type: 'annualAccountAnalysis',
        id: this.webWorkerService.getID(),
        results: undefined,
        input: {
          accountAnalysisItem: this.latestAnalysisItem,
          account: this.account,
          calanderizedMeters: calanderizedMeters,
          accountPredictorEntries: accountPredictorEntries,
          accountFacilities: accountFacilities,
          accountAnalysisItems: accountAnalysisItems,
          includeFacilitySummaries: true
        }
      }


      this.resultsSub = this.webWorkerService.workerResults.subscribe(val => {
        if (val && val.id == workerAnnualRequest.id) {
          console.log(val);
          this.latestAnalysisSummary = _.maxBy(val.results.annualAnalysisSummary, 'year');
          if (this.latestAnalysisSummary) {
            this.accountAnalysisYear = this.latestAnalysisSummary.year;
            this.setProgressPercentages();
          } else {
            this.accountAnalysisYear = undefined;
            this.percentSavings = 0;
            this.percentTowardsGoal = 0;
          }
          this.monthlyAccountAnalysisData = val.results.monthlyAnalysisSummaryData;
          this.calculating = false;
        }
      });

      this.calculating = true;
      this.webWorkerService.addRequest(workerAnnualRequest);
    } else {
      this.accountAnalysisYear = undefined;
      this.percentSavings = 0;
      this.percentTowardsGoal = 0;
    }
  }

}

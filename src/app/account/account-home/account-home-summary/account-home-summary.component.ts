import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAccount, IdbAccountAnalysisItem, IdbOverviewReportOptions, IdbUtilityMeterData } from 'src/app/models/idb';
import { AccountHomeService } from '../account-home.service';
import * as _ from 'lodash';
import { Router } from '@angular/router';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { ExportToExcelTemplateService } from 'src/app/shared/helper-services/export-to-excel-template.service';

@Component({
  selector: 'app-account-home-summary',
  templateUrl: './account-home-summary.component.html',
  styleUrls: ['./account-home-summary.component.css']
})
export class AccountHomeSummaryComponent implements OnInit {

  account: IdbAccount;
  accountSub: Subscription;
  latestAnalysisSummary: MonthlyAnalysisSummaryData;
  latestSummarySub: Subscription;
  latestAnalysisDate: Date;
  percentSavings: number = 0;
  percentGoal: number;
  percentTowardsGoal: number = 0;
  goalYear: number;
  baselineYear: number;

  betterPlantsReportYear: number;
  accountAnalysisYear: number;

  overviewReportOptionsSub: Subscription;
  disableButtons: boolean;
  monthlyFacilityAnalysisData: Array<MonthlyAnalysisSummaryData>;
  monthlyDataSub: Subscription;
  latestAnalysisItem: IdbAccountAnalysisItem;
  calculatingSub: Subscription;
  calculating: boolean;
  constructor(private accountDbService: AccountdbService, private accountHomeService: AccountHomeService,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService, private router: Router,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private exportToExcelTemplateService: ExportToExcelTemplateService) { }

  ngOnInit(): void {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val;
      this.setGoalYears();
      this.latestAnalysisItem = this.accountHomeService.latestAnalysisItem;
      if(this.latestAnalysisItem){
        this.accountAnalysisYear = this.latestAnalysisItem.reportYear;
      }else{
        this.accountAnalysisYear = undefined;
      }
      let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
      this.disableButtons = (accountMeterData.length == 0);
    });
    this.latestSummarySub = this.accountHomeService.monthlyAccountAnalysisData.subscribe(val => {
      this.latestAnalysisSummary = _.maxBy(val, 'date');
      if (this.latestAnalysisSummary) {
        this.latestAnalysisDate = new Date(this.latestAnalysisSummary.date);
        this.setProgressPercentages();
      } else {
        this.latestAnalysisDate = undefined
        this.percentSavings = 0;
        this.percentTowardsGoal = 0;
      }
    });

    this.calculatingSub = this.accountHomeService.calculating.subscribe(val => {
      this.calculating = val;
      if(!this.calculating){
        this.monthlyFacilityAnalysisData = this.accountHomeService.monthlyAccountAnalysisData.getValue();
      }
    })


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
    this.latestSummarySub.unsubscribe();
    this.overviewReportOptionsSub.unsubscribe();
  }

  setGoalYears() {
    if (this.account && this.account.sustainabilityQuestions) {
      this.percentGoal = this.account.sustainabilityQuestions.energyReductionPercent;
      this.goalYear = this.account.sustainabilityQuestions.energyReductionTargetYear;
      this.baselineYear = this.account.sustainabilityQuestions.energyReductionBaselineYear;
    }
  }

  setProgressPercentages() {
    this.percentSavings = this.latestAnalysisSummary.rolling12MonthImprovement;
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


 
}

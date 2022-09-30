import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAccount, IdbOverviewReportOptions, IdbUtilityMeterData } from 'src/app/models/idb';
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
  latestAnalysisSummary: AnnualAnalysisSummary;
  latestSummarySub: Subscription;
  percentSavings: number;
  percentGoal: number;
  percentTowardsGoal: number;
  goalYear: number;
  baselineYear: number;

  betterPlantsReportYear: number;
  accountAnalysisYear: number;

  overviewReportOptionsSub: Subscription;
  disableButtons: boolean;

  constructor(private accountDbService: AccountdbService, private accountHomeService: AccountHomeService,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService, private router: Router,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private exportToExcelTemplateService: ExportToExcelTemplateService) { }

  ngOnInit(): void {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val;
      let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
      this.disableButtons = (accountMeterData.length == 0);
    });
    this.latestSummarySub = this.accountHomeService.latestAnalysisSummary.subscribe(val => {
      this.latestAnalysisSummary = val;
      if (this.latestAnalysisSummary) {
        this.accountAnalysisYear = this.latestAnalysisSummary.year;
        this.setProgressPercentages();
      } else {
        this.accountAnalysisYear = undefined;
      }
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
    this.latestSummarySub.unsubscribe();
    this.overviewReportOptionsSub.unsubscribe();
  }

  setProgressPercentages() {
    this.percentSavings = this.latestAnalysisSummary.totalSavingsPercentImprovement;
    this.percentGoal = this.account.sustainabilityQuestions.energyReductionPercent;
    this.goalYear = this.account.sustainabilityQuestions.energyReductionTargetYear;
    this.baselineYear = this.account.sustainabilityQuestions.energyReductionBaselineYear;
    this.percentTowardsGoal = (this.percentSavings / this.percentGoal) * 100;
  }

  navigateTo(urlStr: string) {
    if (urlStr != 'upload') {
      this.router.navigateByUrl('account/' + urlStr);
    } else {
      this.router.navigateByUrl('/' + urlStr);
    }
  }

  exportData(){
    this.exportToExcelTemplateService.exportFacilityData();
  }
}

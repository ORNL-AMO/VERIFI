import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { AccountHomeService } from '../../account-home.service';
import * as _ from 'lodash';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account-energy-reduction-goal',
  templateUrl: './account-energy-reduction-goal.component.html',
  styleUrls: ['./account-energy-reduction-goal.component.css'],
  standalone: false
})
export class AccountEnergyReductionGoalComponent {

  latestAnalysisSummary: MonthlyAnalysisSummaryData;
  latestSummarySub: Subscription;
  percentSavings: number = 0;
  percentGoal: number;
  percentTowardsGoal: number = 0;
  goalYear: number;
  baselineYear: number;
  account: IdbAccount;
  selectedAccountSub: Subscription;
  latestAnalysisDate: Date;
  latestAnalysisItem: IdbAccountAnalysisItem;
  constructor(private accountDbService: AccountdbService,
    private accountHomeService: AccountHomeService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val;
      this.setGoalYears()
    });

    this.latestSummarySub = this.accountHomeService.monthlyEnergyAnalysisData.subscribe(val => {
      this.latestAnalysisItem = this.accountHomeService.latestEnergyAnalysisItem;
      this.latestAnalysisSummary = _.maxBy(val, 'date');
      if (this.latestAnalysisSummary && this.latestAnalysisItem?.selectedYearAnalysis) {
        this.latestAnalysisDate = new Date(this.latestAnalysisSummary.date);
        this.setProgressPercentages();
      } else {
        this.latestAnalysisDate = undefined;
        this.percentSavings = 0;
        this.percentTowardsGoal = 0;
      }
    });
  }

  ngOnDestroy() {
    this.latestSummarySub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
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
    if (this.percentTowardsGoal < 0) {
      this.percentTowardsGoal = 0;
    }
  }

  goToAnalysisItem() {
    this.accountAnalysisDbService.selectedAnalysisItem.next(this.latestAnalysisItem);
    if (this.latestAnalysisItem.setupErrors.hasError || this.latestAnalysisItem.setupErrors.facilitiesSelectionsInvalid) {
      this.router.navigateByUrl('/data-evaluation/account/analysis/setup');
    } else {
      this.router.navigateByUrl('/data-evaluation/account/analysis/results');
    }
  }
}

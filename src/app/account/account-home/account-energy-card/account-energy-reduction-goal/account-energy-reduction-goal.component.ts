import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAccount } from 'src/app/models/idb';
import { AccountHomeService } from '../../account-home.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-account-energy-reduction-goal',
  templateUrl: './account-energy-reduction-goal.component.html',
  styleUrls: ['./account-energy-reduction-goal.component.css']
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
  constructor(private accountDbService: AccountdbService, private accountHomeService: AccountHomeService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val;
      this.setGoalYears()
    });

    this.latestSummarySub = this.accountHomeService.monthlyEnergyAnalysisData.subscribe(val => {
      this.latestAnalysisSummary = _.maxBy(val, 'date');
      if (this.latestAnalysisSummary) {
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
}

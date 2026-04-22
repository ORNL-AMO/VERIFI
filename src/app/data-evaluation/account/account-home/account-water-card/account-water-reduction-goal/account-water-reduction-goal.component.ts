import { Component, computed, inject, Signal } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { AccountHomeService } from '../../account-home.service';
import * as _ from 'lodash';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-account-water-reduction-goal',
  templateUrl: './account-water-reduction-goal.component.html',
  styleUrls: ['./account-water-reduction-goal.component.css'],
  standalone: false
})
export class AccountWaterReductionGoalComponent {
  private accountDbService: AccountdbService = inject(AccountdbService);
  private accountHomeService: AccountHomeService = inject(AccountHomeService);
  private accountAnalysisDbService: AccountAnalysisDbService = inject(AccountAnalysisDbService);
  private router: Router = inject(Router);

  latestAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountHomeService.latestWaterAnalysisItem, { initialValue: undefined });
  account: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount, { initialValue: undefined });
  monthlyWaterAnalysisData: Signal<Array<MonthlyAnalysisSummaryData>> = toSignal(this.accountHomeService.monthlyWaterAnalysisData, { initialValue: [] });

  latestAnalysisSummary: Signal<MonthlyAnalysisSummaryData> = computed(() => {
    const monthlyWaterAnalysisData = this.monthlyWaterAnalysisData();
    return _.maxBy(monthlyWaterAnalysisData, (mData: MonthlyAnalysisSummaryData) => mData.date);
  });
  percentSavings: Signal<number> = computed(() => {
    const latestAnalysisSummary = this.latestAnalysisSummary();
    return latestAnalysisSummary ? latestAnalysisSummary.rolling12MonthImprovement : 0;
  });
  percentGoal: Signal<number> = computed(() => {
    const account = this.account();
    return account && account.sustainabilityQuestions ? account.sustainabilityQuestions.waterReductionPercent : 0;
  });
  percentTowardsGoal: Signal<number> = computed(() => {
    const percentSavings = this.percentSavings();
    const percentGoal = this.percentGoal();
    const percentTowardsGoal = percentGoal ? (percentSavings / percentGoal) * 100 : 0;
    return percentTowardsGoal < 0 || isNaN(percentTowardsGoal) ? 0 : percentTowardsGoal;
  });
  goalYear: Signal<number> = computed(() => {
    const account = this.account();
    return account && account.sustainabilityQuestions ? account.sustainabilityQuestions.waterReductionTargetYear : undefined;
  });
  baselineYear: Signal<number> = computed(() => {
    const account = this.account();
    return account && account.sustainabilityQuestions ? account.sustainabilityQuestions.waterReductionBaselineYear : undefined;
  });
  latestAnalysisDate: Signal<Date> = computed(() => {
    const latestAnalysisSummary = this.latestAnalysisSummary();
    return latestAnalysisSummary ? new Date(latestAnalysisSummary.date) : undefined;
  });

  goToAnalysisItem() {
    this.accountAnalysisDbService.selectedAnalysisItem.next(this.latestAnalysisItem());
    this.router.navigateByUrl('/data-evaluation/account/analysis/setup');
  }
}

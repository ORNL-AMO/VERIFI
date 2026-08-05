import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
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
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { AccountAnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/accountAnalysisStatusCheck';

@Component({
  selector: 'app-account-energy-reduction-goal',
  templateUrl: './account-energy-reduction-goal.component.html',
  styleUrls: ['./account-energy-reduction-goal.component.css'],
  standalone: false
})
export class AccountEnergyReductionGoalComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  private accountDbService: AccountdbService = inject(AccountdbService);
  private accountHomeService: AccountHomeService = inject(AccountHomeService);
  private accountAnalysisDbService: AccountAnalysisDbService = inject(AccountAnalysisDbService);
  private router: Router = inject(Router);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  latestAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountHomeService.latestEnergyAnalysisItem, { initialValue: undefined });
  account: Signal<IdbAccount> = this.accountWorkspaceStore.account;
  monthlyEnergyAnalysisData: Signal<Array<MonthlyAnalysisSummaryData>> = toSignal(this.accountHomeService.monthlyEnergyAnalysisData, { initialValue: [] });
  accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck, { initialValue: null });

  latestAnalysisSummary: Signal<MonthlyAnalysisSummaryData> = computed(() => {
    const monthlyEnergyAnalysisData = this.monthlyEnergyAnalysisData();
    return _.maxBy(monthlyEnergyAnalysisData, (mData: MonthlyAnalysisSummaryData) => mData.date);
  });
  percentSavings: Signal<number> = computed(() => {
    const latestAnalysisSummary = this.latestAnalysisSummary();
    return latestAnalysisSummary ? latestAnalysisSummary.rolling12MonthImprovement : 0;
  });
  percentGoal: Signal<number> = computed(() => {
    const account = this.account();
    return account && account.sustainabilityQuestions ? account.sustainabilityQuestions.energyReductionPercent : 0;
  });
  percentTowardsGoal: Signal<number> = computed(() => {
    const percentSavings = this.percentSavings();
    const percentGoal = this.percentGoal();
    if (percentGoal === 0) {
      return 0;
    }
    const percentTowardsGoal = percentGoal ? (percentSavings / percentGoal) * 100 : 0;
    return percentTowardsGoal < 0 ? 0 : percentTowardsGoal;
  });
  goalYear: Signal<number> = computed(() => {
    const account = this.account();
    return account && account.sustainabilityQuestions ? account.sustainabilityQuestions.energyReductionTargetYear : undefined;
  });
  baselineYear: Signal<number> = computed(() => {
    const account = this.account();
    return account && account.sustainabilityQuestions ? account.sustainabilityQuestions.energyReductionBaselineYear : undefined;
  });
  latestAnalysisDate: Signal<Date> = computed(() => {
    const latestAnalysisSummary = this.latestAnalysisSummary();
    return latestAnalysisSummary ? new Date(latestAnalysisSummary.date) : undefined;
  });
  analysisStatusCheck: Signal<AccountAnalysisStatusCheck> = computed(() => {
    const latestAnalysisItem = this.latestAnalysisItem();
    const accountStatusCheck = this.accountStatusCheck();
    if (latestAnalysisItem && accountStatusCheck) {
      return accountStatusCheck.getAccountAnalysisStatusCheckById(latestAnalysisItem.guid);
    }
    return null;
  });

  goToAnalysisItem() {
    this.accountWorkspaceService.selectAccountAnalysis((this.latestAnalysisItem())?.guid);
    this.router.navigateByUrl('/data-evaluation/account/analysis/setup');
  }
}

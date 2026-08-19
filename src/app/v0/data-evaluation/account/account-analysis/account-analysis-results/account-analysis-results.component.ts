import { AccountWorkspaceStore } from '@app/account-workspace/account-workspace.store';
import { Component, computed, DestroyRef, inject, OnInit, Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AnnualAccountAnalysisSummaryClass } from '@app/calculations/analysis-calculations/annualAccountAnalysisSummaryClass';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@app/models/analysis';
import { SharedDataService } from '@app/shared/helper-services/shared-data.service';
import { AccountAnalysisService } from '@v0/data-evaluation/account/account-analysis/account-analysis.service';
import { IdbFacility } from '@app/models/idbModels/facility';
import { IdbUtilityMeter } from '@app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@app/models/idbModels/utilityMeterData';
import { IdbPredictor } from '@app/models/idbModels/predictor';
import { IdbPredictorData } from '@app/models/idbModels/predictorData';
import { IdbAnalysisItem } from '@app/models/idbModels/analysisItem';
import { runWorker } from '@app/web-workers/run-worker';
import { AccountStatusCheckService } from '@app/shared/helper-services/account-status-check.service';
import { AnalysisStatusCheck } from '@app/calculations/status-check-calculations/analysisStatusCheck';

@Component({
  selector: 'app-account-analysis-results',
  templateUrl: './account-analysis-results.component.html',
  styleUrls: ['./account-analysis-results.component.css'],
  standalone: false
})
export class AccountAnalysisResultsComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly accountAnalysisService = inject(AccountAnalysisService);
  private readonly sharedDataService = inject(SharedDataService);
  private readonly accountStatusCheckService = inject(AccountStatusCheckService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly accountStatusCheck = toSignal(this.accountStatusCheckService.accountStatusCheck);
  private readonly accountAnalysisItem = this.accountWorkspaceStore.selectedAccountAnalysis;
  private readonly annualAnalysisSummaries: Signal<Array<AnnualAnalysisSummary>> = toSignal(
    this.accountAnalysisService.annualAnalysisSummary,
    { initialValue: [] }
  );

  readonly selectedAnalysisStatusChecks: Signal<Array<AnalysisStatusCheck>> = computed(() => {
    const accountStatusCheck = this.accountStatusCheck();
    const accountAnalysisItem = this.accountAnalysisItem();
    if (!accountStatusCheck || !accountAnalysisItem) {
      return [];
    }

    return accountStatusCheck
      .getAccountAnalysisStatusCheckById(accountAnalysisItem.guid)
      ?.includedFacilityAnalysisStatusChecks ?? [];
  });

  readonly calculatedReportYear: Signal<number | undefined> = computed(() => {
    const annualAnalysisSummaries = this.annualAnalysisSummaries();
    return annualAnalysisSummaries?.length > 0
      ? annualAnalysisSummaries[annualAnalysisSummaries.length - 1].year
      : undefined;
  });

  ngOnInit(): void {
    const accountAnalysisItem = this.accountWorkspaceStore.selectedAccountAnalysis();
    const account = this.accountWorkspaceStore.account();
    const accountFacilities: IdbFacility[] = [...this.accountWorkspaceStore.facilities()];
    const accountPredictorEntries: IdbPredictorData[] = [...this.accountWorkspaceStore.predictorData()];
    const accountPredictors: IdbPredictor[] = [...this.accountWorkspaceStore.predictors()];
    const accountAnalysisItems: IdbAnalysisItem[] = [...this.accountWorkspaceStore.facilityAnalyses()];
    const meters: IdbUtilityMeter[] = [...this.accountWorkspaceStore.meters()];
    const meterData: IdbUtilityMeterData[] = [...this.accountWorkspaceStore.meterData()];

    const payload = {
      accountAnalysisItem,
      account,
      accountFacilities,
      accountPredictorEntries,
      allAccountAnalysisItems: accountAnalysisItems,
      calculateAllMonthlyData: false,
      meters,
      meterData,
      accountPredictors
    };

    if (typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('../../../../web-workers/annual-account-analysis.worker', import.meta.url));
      this.accountAnalysisService.calculating.next(true);
      runWorker<any>(worker, payload).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: (data) => {
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
        },
        error: () => {
          this.accountAnalysisService.annualAnalysisSummary.next(undefined);
          this.accountAnalysisService.monthlyAccountAnalysisData.next(undefined);
          this.accountAnalysisService.facilitySummaries.next(undefined);
          this.accountAnalysisService.calculating.next('error');
        }
      });
    } else {
      // Web Workers are not supported in this environment.
      const annualAnalysisSummaryClass = new AnnualAccountAnalysisSummaryClass(
        accountAnalysisItem, account, accountFacilities, accountPredictorEntries,
        accountAnalysisItems, false, meters, meterData, accountPredictors
      );
      const annualAnalysisSummaries: AnnualAnalysisSummary[] = annualAnalysisSummaryClass.getAnnualAnalysisSummaries();
      const monthlyAnalysisSummaryData: MonthlyAnalysisSummaryData[] = annualAnalysisSummaryClass.monthlyAnalysisSummaryData;
      this.accountAnalysisService.annualAnalysisSummary.next(annualAnalysisSummaries);
      this.accountAnalysisService.monthlyAccountAnalysisData.next(monthlyAnalysisSummaryData);
      this.accountAnalysisService.facilitySummaries.next(annualAnalysisSummaryClass.facilitySummaries);
      this.accountAnalysisService.calculating.next(false);
    }
  }

  createNewReport() {
    this.sharedDataService.openCreateReportModal.next(true);
  }
}

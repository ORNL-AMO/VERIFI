import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, computed, DestroyRef, inject, OnInit, Signal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AnnualAnalysisSummary } from '@data/models/analysis';
import { SharedDataService } from '@shared/helper-services/shared-data.service';
import { AccountAnalysisService } from '@v0/data-evaluation/account/account-analysis/account-analysis.service';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';
import { EMPTY, catchError, map, of, switchMap } from 'rxjs';
import { isEqual } from 'lodash';
import { AccountAnalysisResultsRequest, AccountAnalysisResultsResponse, runAccountAnalysisResults } from './account-analysis-results-calculation';
import { AnalysisStatusCheck } from '@domain/calculations/status-check-calculations/analysisStatusCheck';

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

  private readonly retryAttempt = signal(0);
  readonly calculating = toSignal(this.accountAnalysisService.calculating, { initialValue: true as boolean | 'error' });
  private readonly calculationInput = computed(() => {
    const attempt = this.retryAttempt();
    const snapshot = this.accountWorkspaceStore.snapshot();
    const selected = this.accountAnalysisItem();
    if (!this.accountWorkspaceStore.isReady() || !snapshot || !selected || selected.accountId !== snapshot.account.guid) return undefined;
    const accountAnalysisItem = snapshot.accountAnalyses.find(item => item.guid === selected.guid);
    if (!accountAnalysisItem) return undefined;
    const request: AccountAnalysisResultsRequest = structuredClone({
      accountAnalysisItem,
      account: snapshot.account,
      accountFacilities: [...snapshot.facilities],
      accountPredictorEntries: [...snapshot.predictorData],
      allAccountAnalysisItems: [...snapshot.facilityAnalyses],
      calculateAllMonthlyData: false as const,
      meters: [...snapshot.meters],
      meterData: [...snapshot.meterData],
      accountPredictors: [...snapshot.predictors]
    });
    return { request, attempt };
  }, { equal: isEqual });
  private readonly calculationInput$ = toObservable(this.calculationInput);

  ngOnInit(): void {
    this.calculationInput$.pipe(
      switchMap(input => {
        this.clearResults();
        this.accountAnalysisService.calculating.next(true);
        if (!input) return EMPTY;
        return runAccountAnalysisResults(input.request).pipe(
          catchError(() => of<AccountAnalysisResultsResponse>({ error: true })),
          map(response => ({ input, response }))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ input, response }) => {
      // A workspace commit can precede Angular's observable synchronization.
      if (!isEqual(input, this.calculationInput())) return;
      if (response.error || !response.annualAnalysisSummaries || !response.monthlyAnalysisSummaryData || !response.facilitySummaries) {
        this.clearResults();
        this.accountAnalysisService.calculating.next('error');
        return;
      }
      this.accountAnalysisService.annualAnalysisSummary.next(response.annualAnalysisSummaries);
      this.accountAnalysisService.monthlyAccountAnalysisData.next(response.monthlyAnalysisSummaryData);
      this.accountAnalysisService.facilitySummaries.next(response.facilitySummaries);
      this.accountAnalysisService.calculating.next(false);
    });
    this.destroyRef.onDestroy(() => {
      this.clearResults();
      this.accountAnalysisService.calculating.next(false);
    });
  }

  retry(): void {
    this.retryAttempt.update(attempt => attempt + 1);
  }

  private clearResults(): void {
    this.accountAnalysisService.annualAnalysisSummary.next(undefined);
    this.accountAnalysisService.monthlyAccountAnalysisData.next(undefined);
    this.accountAnalysisService.facilitySummaries.next(undefined);
  }

  createNewReport() {
    this.sharedDataService.openCreateReportModal.next(true);
  }
}

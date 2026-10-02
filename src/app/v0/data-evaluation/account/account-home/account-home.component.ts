import { Component, effect, inject, OnDestroy, Signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { CalanderizedMeter, MonthlyData } from '@data/models/calanderization';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { AnnualAccountAnalysisSummaryClass } from '@domain/calculations/analysis-calculations/annualAccountAnalysisSummaryClass';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { AccountOverviewData } from '@domain/calculations/dashboard-calculations/accountOverviewClass';
import { CALCULATION_WORKER_TIMEOUT_MS, runWorker } from '@platform/web-workers/run-worker';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { AccountHomeService } from '@v0/data-evaluation/account/account-home/account-home.service';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { timeout } from 'rxjs/operators';

interface AnalysisWorkerResult {
  annualAnalysisSummaries?: Array<AnnualAnalysisSummary>;
  monthlyAnalysisSummaryData?: Array<MonthlyAnalysisSummaryData>;
  error: boolean;
}

interface OverviewWorkerResult {
  accountOverviewData?: AccountOverviewData;
  error: boolean;
}

interface CalculationRequestContext {
  accountGuid: string;
  workspaceRevision: number;
  requestId: number;
}

@Component({
  selector: 'app-account-home',
  templateUrl: './account-home.component.html',
  styleUrls: ['./account-home.component.css'],
  standalone: false
})
export class AccountHomeComponent implements OnDestroy {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly accountHomeService = inject(AccountHomeService);
  private readonly eGridService = inject(EGridService);

  account: Signal<IdbAccount> = this.accountWorkspaceStore.account;
  accountFacilities = this.accountWorkspaceStore.facilities;

  latestEnergyAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountHomeService.latestEnergyAnalysisItem, { initialValue: undefined });
  latestWaterAnalysisItem: Signal<IdbAccountAnalysisItem> = toSignal(this.accountHomeService.latestWaterAnalysisItem, { initialValue: undefined });
  monthlyEnergyAnalysisData: Signal<Array<MonthlyAnalysisSummaryData>> = toSignal(this.accountHomeService.monthlyEnergyAnalysisData, { initialValue: undefined });
  monthlyWaterAnalysisData: Signal<Array<MonthlyAnalysisSummaryData>> = toSignal(this.accountHomeService.monthlyWaterAnalysisData, { initialValue: undefined });

  private activeSnapshot?: AccountWorkspaceSnapshot;
  private activeRevision = 0;
  private energySub?: Subscription;
  private waterSub?: Subscription;
  private overviewSub?: Subscription;
  private energyRequestId = 0;
  private waterRequestId = 0;
  private overviewRequestId = 0;

  constructor() {
    effect(() => {
      const status = this.accountWorkspaceStore.status();
      const snapshot = this.accountWorkspaceStore.snapshot();
      const revision = this.accountWorkspaceStore.revision();
      untracked(() => {
        if (status === 'ready') {
          this.activateWorkspace(snapshot, revision);
        } else {
          this.suspendWorkspace(status === 'loading' || status === 'switching');
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.activeSnapshot = undefined;
    this.cancelAllJobs();
    this.clearPublishedResults();
    this.accountHomeService.calculatingEnergy.next(false);
    this.accountHomeService.calculatingOverview.next(false);
    this.accountHomeService.calculatingWater.next(false);
  }

  retryEnergyCard(): void {
    const snapshot = this.accountWorkspaceStore.snapshot();
    if (!snapshot) return;
    const revision = this.accountWorkspaceStore.revision();
    const analysisItem = this.accountHomeService.setLatestEnergyAnalysisItem(snapshot.account.selectedEnergyAnalysisId, snapshot.accountAnalyses);
    this.activeSnapshot = snapshot;
    this.activeRevision = revision;
    this.startEnergyAnalysis(snapshot, revision, analysisItem);
    this.startOverview(snapshot, revision);
  }

  retryWaterCard(): void {
    const snapshot = this.accountWorkspaceStore.snapshot();
    if (!snapshot) return;
    const revision = this.accountWorkspaceStore.revision();
    const analysisItem = this.accountHomeService.setLatestWaterAnalysisItem(snapshot.account.selectedWaterAnalysisId, snapshot.accountAnalyses);
    this.activeSnapshot = snapshot;
    this.activeRevision = revision;
    this.startWaterAnalysis(snapshot, revision, analysisItem);
    this.startOverview(snapshot, revision);
  }

  private activateWorkspace(snapshot: AccountWorkspaceSnapshot | undefined, revision: number): void {
    this.activeSnapshot = snapshot;
    this.activeRevision = revision;
    this.cancelAllJobs();
    this.clearPublishedResults();

    if (!snapshot) {
      this.accountHomeService.latestEnergyAnalysisItem.next(undefined);
      this.accountHomeService.latestWaterAnalysisItem.next(undefined);
      this.accountHomeService.calculatingEnergy.next(false);
      this.accountHomeService.calculatingWater.next(false);
      this.accountHomeService.calculatingOverview.next(false);
      return;
    }

    const energyItem = this.accountHomeService.setLatestEnergyAnalysisItem(snapshot.account.selectedEnergyAnalysisId, snapshot.accountAnalyses);
    const waterItem = this.accountHomeService.setLatestWaterAnalysisItem(snapshot.account.selectedWaterAnalysisId, snapshot.accountAnalyses);
    this.startEnergyAnalysis(snapshot, revision, energyItem);
    this.startWaterAnalysis(snapshot, revision, waterItem);
    this.startOverview(snapshot, revision);
  }

  private suspendWorkspace(showLoading: boolean): void {
    this.activeSnapshot = undefined;
    this.cancelAllJobs();
    this.clearPublishedResults();
    this.accountHomeService.calculatingEnergy.next(showLoading);
    this.accountHomeService.calculatingWater.next(showLoading);
    this.accountHomeService.calculatingOverview.next(showLoading);
  }

  private startEnergyAnalysis(snapshot: AccountWorkspaceSnapshot, revision: number, analysisItem: IdbAccountAnalysisItem | undefined): void {
    this.cancelEnergyJob();
    this.accountHomeService.annualEnergyAnalysisSummary.next(undefined);
    this.accountHomeService.monthlyEnergyAnalysisData.next(undefined);
    if (!analysisItem) {
      this.accountHomeService.calculatingEnergy.next(false);
      return;
    }

    const requestId = ++this.energyRequestId;
    const requestContext = this.getRequestContext(snapshot, revision, requestId);
    this.accountHomeService.calculatingEnergy.next(true);
    if (typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('../../../../platform/web-workers/annual-account-analysis.worker', import.meta.url));
      this.energySub = runWorker<AnalysisWorkerResult>(worker, this.getAnalysisPayload(snapshot, analysisItem, requestContext)).pipe(
        timeout(CALCULATION_WORKER_TIMEOUT_MS)
      ).subscribe({
        next: data => {
          if (!this.isCurrentEnergyRequest(snapshot, revision, requestId)) return;
          if (data.error || !data.annualAnalysisSummaries || !data.monthlyAnalysisSummaryData) {
            this.publishEnergyError();
            return;
          }
          this.setEnergyBehaviorSubjects(data.annualAnalysisSummaries, data.monthlyAnalysisSummaryData);
          this.accountHomeService.calculatingEnergy.next(false);
        },
        error: () => {
          if (this.isCurrentEnergyRequest(snapshot, revision, requestId)) this.publishEnergyError();
        }
      });
      return;
    }

    try {
      const summary = this.calculateAnalysisSynchronously(snapshot, analysisItem);
      if (!this.isCurrentEnergyRequest(snapshot, revision, requestId)) return;
      this.setEnergyBehaviorSubjects(summary.annualAnalysisSummaries, summary.monthlyAnalysisSummaryData);
      this.accountHomeService.calculatingEnergy.next(false);
    } catch {
      if (this.isCurrentEnergyRequest(snapshot, revision, requestId)) this.publishEnergyError();
    }
  }

  private startWaterAnalysis(snapshot: AccountWorkspaceSnapshot, revision: number, analysisItem: IdbAccountAnalysisItem | undefined): void {
    this.cancelWaterJob();
    this.accountHomeService.annualWaterAnalysisSummary.next(undefined);
    this.accountHomeService.monthlyWaterAnalysisData.next(undefined);
    if (!analysisItem) {
      this.accountHomeService.calculatingWater.next(false);
      return;
    }

    const requestId = ++this.waterRequestId;
    const requestContext = this.getRequestContext(snapshot, revision, requestId);
    this.accountHomeService.calculatingWater.next(true);
    if (typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('../../../../platform/web-workers/annual-account-analysis.worker', import.meta.url));
      this.waterSub = runWorker<AnalysisWorkerResult>(worker, this.getAnalysisPayload(snapshot, analysisItem, requestContext)).pipe(
        timeout(CALCULATION_WORKER_TIMEOUT_MS)
      ).subscribe({
        next: data => {
          if (!this.isCurrentWaterRequest(snapshot, revision, requestId)) return;
          if (data.error || !data.annualAnalysisSummaries || !data.monthlyAnalysisSummaryData) {
            this.publishWaterError();
            return;
          }
          this.setWaterBehaviorSubjects(data.annualAnalysisSummaries, data.monthlyAnalysisSummaryData);
          this.accountHomeService.calculatingWater.next(false);
        },
        error: () => {
          if (this.isCurrentWaterRequest(snapshot, revision, requestId)) this.publishWaterError();
        }
      });
      return;
    }

    try {
      const summary = this.calculateAnalysisSynchronously(snapshot, analysisItem);
      if (!this.isCurrentWaterRequest(snapshot, revision, requestId)) return;
      this.setWaterBehaviorSubjects(summary.annualAnalysisSummaries, summary.monthlyAnalysisSummaryData);
      this.accountHomeService.calculatingWater.next(false);
    } catch {
      if (this.isCurrentWaterRequest(snapshot, revision, requestId)) this.publishWaterError();
    }
  }

  private startOverview(snapshot: AccountWorkspaceSnapshot, revision: number): void {
    this.cancelOverviewJob();
    this.accountHomeService.accountOverviewData.next(undefined);
    const requestId = ++this.overviewRequestId;
    const requestContext = this.getRequestContext(snapshot, revision, requestId);
    this.accountHomeService.calculatingOverview.next(true);
    if (typeof Worker !== 'undefined') {
      const worker = new Worker(new URL('../../../../platform/web-workers/account-overview.worker', import.meta.url));
      this.overviewSub = runWorker<OverviewWorkerResult>(worker, this.getOverviewPayload(snapshot, requestContext)).pipe(
        timeout(CALCULATION_WORKER_TIMEOUT_MS)
      ).subscribe({
        next: data => {
          if (!this.isCurrentOverviewRequest(snapshot, revision, requestId)) return;
          if (data.error || !data.accountOverviewData) {
            this.publishOverviewError();
            return;
          }
          this.accountHomeService.accountOverviewData.next(data.accountOverviewData);
          this.accountHomeService.calculatingOverview.next(false);
        },
        error: () => {
          if (this.isCurrentOverviewRequest(snapshot, revision, requestId)) this.publishOverviewError();
        }
      });
      return;
    }

    try {
      const accountOverviewData = this.calculateOverviewSynchronously(snapshot);
      if (!this.isCurrentOverviewRequest(snapshot, revision, requestId)) return;
      this.accountHomeService.accountOverviewData.next(accountOverviewData);
      this.accountHomeService.calculatingOverview.next(false);
    } catch {
      if (this.isCurrentOverviewRequest(snapshot, revision, requestId)) this.publishOverviewError();
    }
  }

  private getAnalysisPayload(snapshot: AccountWorkspaceSnapshot, analysisItem: IdbAccountAnalysisItem, requestContext: CalculationRequestContext): object {
    return {
      requestContext,
      accountAnalysisItem: analysisItem,
      account: snapshot.account,
      accountFacilities: [...snapshot.facilities],
      accountPredictorEntries: [...snapshot.predictorData],
      allAccountAnalysisItems: [...snapshot.facilityAnalyses],
      calculateAllMonthlyData: true,
      meters: [...snapshot.meters],
      meterData: [...snapshot.meterData],
      accountPredictors: [...snapshot.predictors]
    };
  }

  private getOverviewPayload(snapshot: AccountWorkspaceSnapshot, requestContext: CalculationRequestContext): object {
    return {
      requestContext,
      meters: [...snapshot.meters],
      facilities: [...snapshot.facilities],
      type: 'overview',
      dateRange: undefined,
      meterData: [...snapshot.meterData],
      inOverview: false,
      account: snapshot.account,
      energyIsSource: snapshot.account.energyIsSource,
      co2Emissions: this.eGridService.co2Emissions,
      customFuels: [...snapshot.customFuels],
      customGWPs: [...snapshot.customGWPs]
    };
  }

  private calculateAnalysisSynchronously(snapshot: AccountWorkspaceSnapshot, analysisItem: IdbAccountAnalysisItem): { annualAnalysisSummaries: Array<AnnualAnalysisSummary>; monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> } {
    const summaryClass = new AnnualAccountAnalysisSummaryClass(
      analysisItem,
      snapshot.account,
      [...snapshot.facilities],
      [...snapshot.predictorData],
      [...snapshot.facilityAnalyses],
      true,
      [...snapshot.meters],
      [...snapshot.meterData],
      [...snapshot.predictors]
    );
    return {
      annualAnalysisSummaries: summaryClass.getAnnualAnalysisSummaries(),
      monthlyAnalysisSummaryData: summaryClass.monthlyAnalysisSummaryData
    };
  }

  private calculateOverviewSynchronously(snapshot: AccountWorkspaceSnapshot): AccountOverviewData {
    const calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(
      [...snapshot.meters],
      [...snapshot.meterData],
      snapshot.account,
      true,
      { energyIsSource: snapshot.account.energyIsSource, neededUnits: undefined },
      this.eGridService.co2Emissions,
      [...snapshot.customFuels],
      [...snapshot.facilities],
      snapshot.account.assessmentReportVersion,
      [...snapshot.customGWPs]
    );
    let dateRange: { endDate: Date; startDate: Date } | undefined;
    if (calanderizedMeters.length > 0) {
      const monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(value => value.monthlyData);
      if (monthlyData.length > 0) {
        const latestData: MonthlyData = _.maxBy(monthlyData, 'date');
        const startData: MonthlyData = _.minBy(monthlyData, 'date');
        const maxDate = new Date(latestData.year, latestData.monthNumValue);
        const minDate = new Date(startData.year, startData.monthNumValue);
        minDate.setMonth(minDate.getMonth() + 1);
        dateRange = { endDate: maxDate, startDate: minDate };
      }
    }
    return new AccountOverviewData(calanderizedMeters, [...snapshot.facilities], snapshot.account, dateRange);
  }

  private setEnergyBehaviorSubjects(annual: Array<AnnualAnalysisSummary>, monthly: Array<MonthlyAnalysisSummaryData>): void {
    this.accountHomeService.annualEnergyAnalysisSummary.next(annual.filter(summary => !isNaN(summary.adjusted)));
    this.accountHomeService.monthlyEnergyAnalysisData.next(monthly.filter(summary => !isNaN(summary.adjusted) && summary.energyUse !== 0));
  }

  private setWaterBehaviorSubjects(annual: Array<AnnualAnalysisSummary>, monthly: Array<MonthlyAnalysisSummaryData>): void {
    this.accountHomeService.annualWaterAnalysisSummary.next(annual.filter(summary => !isNaN(summary.adjusted)));
    this.accountHomeService.monthlyWaterAnalysisData.next(monthly.filter(summary => !isNaN(summary.adjusted) && summary.energyUse !== 0));
  }

  private getRequestContext(snapshot: AccountWorkspaceSnapshot, revision: number, requestId: number): CalculationRequestContext {
    return { accountGuid: snapshot.account.guid, workspaceRevision: revision, requestId };
  }

  private isCurrentWorkspace(snapshot: AccountWorkspaceSnapshot, revision: number): boolean {
    return this.activeSnapshot === snapshot
      && this.activeRevision === revision
      && this.accountWorkspaceStore.snapshot() === snapshot
      && this.accountWorkspaceStore.revision() === revision;
  }

  private isCurrentEnergyRequest(snapshot: AccountWorkspaceSnapshot, revision: number, requestId: number): boolean {
    return this.isCurrentWorkspace(snapshot, revision) && this.energyRequestId === requestId;
  }

  private isCurrentWaterRequest(snapshot: AccountWorkspaceSnapshot, revision: number, requestId: number): boolean {
    return this.isCurrentWorkspace(snapshot, revision) && this.waterRequestId === requestId;
  }

  private isCurrentOverviewRequest(snapshot: AccountWorkspaceSnapshot, revision: number, requestId: number): boolean {
    return this.isCurrentWorkspace(snapshot, revision) && this.overviewRequestId === requestId;
  }

  private publishEnergyError(): void {
    this.accountHomeService.annualEnergyAnalysisSummary.next(undefined);
    this.accountHomeService.monthlyEnergyAnalysisData.next(undefined);
    this.accountHomeService.calculatingEnergy.next('error');
  }

  private publishWaterError(): void {
    this.accountHomeService.annualWaterAnalysisSummary.next(undefined);
    this.accountHomeService.monthlyWaterAnalysisData.next(undefined);
    this.accountHomeService.calculatingWater.next('error');
  }

  private publishOverviewError(): void {
    this.accountHomeService.accountOverviewData.next(undefined);
    this.accountHomeService.calculatingOverview.next('error');
  }

  private cancelEnergyJob(): void {
    this.energyRequestId++;
    this.energySub?.unsubscribe();
    this.energySub = undefined;
  }

  private cancelWaterJob(): void {
    this.waterRequestId++;
    this.waterSub?.unsubscribe();
    this.waterSub = undefined;
  }

  private cancelOverviewJob(): void {
    this.overviewRequestId++;
    this.overviewSub?.unsubscribe();
    this.overviewSub = undefined;
  }

  private cancelAllJobs(): void {
    this.cancelEnergyJob();
    this.cancelWaterJob();
    this.cancelOverviewJob();
  }

  private clearPublishedResults(): void {
    this.accountHomeService.monthlyEnergyAnalysisData.next(undefined);
    this.accountHomeService.annualEnergyAnalysisSummary.next(undefined);
    this.accountHomeService.monthlyWaterAnalysisData.next(undefined);
    this.accountHomeService.annualWaterAnalysisSummary.next(undefined);
    this.accountHomeService.accountOverviewData.next(undefined);
  }
}

import { toSignal } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, DestroyRef, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import { AnalysisService } from '@v0/data-evaluation/facility/analysis/analysis.service';
import { AnalysisGroup, AnnualAnalysisSummary } from '@data/models/analysis';
import { AnnualGroupAnalysisSummaryClass } from '@domain/calculations/analysis-calculations/annualGroupAnalysisSummaryClass';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { CALCULATION_WORKER_TIMEOUT_MS, runWorker } from '@platform/web-workers/run-worker';
import { Subscription, timeout } from 'rxjs';
import * as _ from 'lodash';

interface AnnualWorkerResult {
  error: boolean;
  annualAnalysisSummaries?: Array<AnnualAnalysisSummary>;
}

@Component({
  selector: 'app-annual-analysis-summary',
  templateUrl: './annual-analysis-summary.component.html',
  styleUrls: ['./annual-analysis-summary.component.css'],
  standalone: false
})
export class AnnualAnalysisSummaryComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly analysisService = inject(AnalysisService);
  private readonly destroyRef = inject(DestroyRef);

  readonly analysisItem: Signal<IdbAnalysisItem> = this.accountWorkspaceStore.selectedFacilityAnalysis;
  readonly facility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;
  private readonly groupSelection = toSignal(this.analysisService.selectedGroup);
  readonly selectedGroup: Signal<AnalysisGroup> = computed(() =>
    this.analysisItem()?.groups.find(group => group.idbGroupId === this.groupSelection()?.idbGroupId));

  readonly key: Signal<string> = computed(() => 'annual-' + this.facility()?.id);
  readonly analysisDisplay = signal<'table' | 'graph'>('table');
  readonly annualAnalysisSummary = signal<Array<AnnualAnalysisSummary>>(undefined);
  readonly calculating = signal<boolean | 'error'>(true);

  private workerSub?: Subscription;
  private requestId = 0;
  private requestInputs?: ReturnType<AnnualAnalysisSummaryComponent['calculationInputs']>;

  constructor() {
    effect(() => {
      this.analysisDisplay.set(this.analysisService.getDisplaySubject(this.key(), 'table').getValue());
    });
    effect(() => this.calculate());
    this.destroyRef.onDestroy(() => this.cancelCalculation());
  }

  retryCalculation(): void {
    this.calculate(true);
  }

  private calculationInputs() {
    const { status, snapshot, selections } = this.accountWorkspaceStore.state();
    const facility = selections.facility;
    const analysisItem = selections.facilityAnalysis;
    const groupGuid = this.groupSelection()?.idbGroupId;
    const selectedGroup = analysisItem?.groups.find(group => group.idbGroupId === groupGuid);
    if (status !== 'ready' || !snapshot || !facility || !analysisItem || !selectedGroup
      || facility.accountId !== snapshot.account.guid || analysisItem.accountId !== snapshot.account.guid
      || analysisItem.facilityId !== facility.guid) { return undefined; }
    return {
      selectedGroup, analysisItem, facility,
      meters: snapshot.meters.filter(meter => meter.facilityId === facility.guid),
      meterData: snapshot.meterData.filter(entry => entry.facilityId === facility.guid),
      accountPredictorEntries: [...snapshot.predictorData],
      accountPredictors: [...snapshot.predictors],
      accountAnalysisItems: [...snapshot.facilityAnalyses],
      assessmentReportVersion: snapshot.account.assessmentReportVersion
    };
  }

  private calculate(force = false): void {
    const inputs = this.calculationInputs();
    if (!inputs) {
      this.cancelCalculation();
      this.requestInputs = undefined;
      this.annualAnalysisSummary.set(undefined);
      this.calculating.set(false);
      return;
    }
    if (!force && this.requestInputs && _.isEqual(this.requestInputs, inputs)
      && (untracked(this.calculating) !== true || (this.workerSub && !this.workerSub.closed))) { return; }
    this.cancelCalculation();
    const requestId = this.requestId;
    this.requestInputs = _.cloneDeep(inputs);
    this.annualAnalysisSummary.set(undefined);
    this.calculating.set(true);
    try {
      if (typeof Worker !== 'undefined') {
        const worker = new Worker(new URL('../../../../../../../platform/web-workers/annual-group-analysis.worker', import.meta.url));
        this.workerSub = runWorker<AnnualWorkerResult>(worker, inputs).pipe(
          timeout(CALCULATION_WORKER_TIMEOUT_MS)
        ).subscribe({
          next: data => {
            if (data.error || !data.annualAnalysisSummaries) {
              this.publishError(requestId);
            } else if (this.isCurrentRequest(requestId)) {
              this.annualAnalysisSummary.set(data.annualAnalysisSummaries);
              this.calculating.set(false);
            }
          },
          error: () => this.publishError(requestId)
        });
      } else {
        // The synchronous calculation may normalize inputs; keep the committed workspace immutable.
        const request = _.cloneDeep(inputs);
        const calanderizedMeters = getCalanderizedMeterData(
          request.meters, request.meterData, request.facility, false,
          { energyIsSource: request.analysisItem.energyIsSource, neededUnits: getNeededUnits(request.analysisItem) },
          [], [], [request.facility], request.assessmentReportVersion, []
        );
        const summary = new AnnualGroupAnalysisSummaryClass(
          request.selectedGroup, request.analysisItem, request.facility, calanderizedMeters,
          request.accountPredictorEntries, undefined, request.accountPredictors, request.accountAnalysisItems
        ).getAnnualAnalysisSummaries();
        if (this.isCurrentRequest(requestId)) {
          this.annualAnalysisSummary.set(summary);
          this.calculating.set(false);
        }
      }
    } catch {
      this.publishError(requestId);
    }
  }

  private isCurrentRequest(requestId: number): boolean {
    return !this.destroyRef.destroyed && requestId === this.requestId
      && !!this.requestInputs && _.isEqual(this.requestInputs, this.calculationInputs());
  }

  private publishError(requestId: number): void {
    if (!this.isCurrentRequest(requestId)) { return; }
    this.annualAnalysisSummary.set(undefined);
    this.calculating.set('error');
  }

  private cancelCalculation(): void {
    this.requestId++;
    this.workerSub?.unsubscribe();
    this.workerSub = undefined;
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.analysisDisplay.set(display);
    this.analysisService.getDisplaySubject(this.key(), 'table').next(display);
  }
}

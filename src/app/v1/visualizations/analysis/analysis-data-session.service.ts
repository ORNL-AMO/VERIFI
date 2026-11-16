import { DestroyRef, Injectable, effect, inject } from '@angular/core';
import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { VisualizationSourceRequest, VisualizationSourceResolution } from '@domain/visualizations/visualization-source-provider';
import type { FacilityVisualizationResults } from '@domain/visualizations/analysis/facility-analysis-source';
import { calculateFacilityAnalysisResults } from '@domain/calculations/analysis-calculations/facility-analysis-results-calculation';
import { calculateFacilityAnalysisGroupResults } from '@domain/calculations/analysis-calculations/facility-analysis-group-results-calculation';
import type { FacilityAnalysisResultsWorkerRequest, FacilityAnalysisResultsWorkerResponse } from '@platform/web-workers/facility-analysis-results-worker.contract';
import type { FacilityAnalysisGroupResultsWorkerRequest, FacilityAnalysisGroupResultsWorkerResponse } from '@platform/web-workers/facility-analysis-group-results-worker.contract';
import { CALCULATION_WORKER_TIMEOUT_MS, runWorker } from '@platform/web-workers/run-worker';
import { of, timeout, type Observable, type Subscription } from 'rxjs';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { evaluateWorkspaceStatus } from '@app/v1/status/status.evaluator';
import { buildFacilityDashboardResultsRequest, facilityAnalysisResultsFingerprint } from '@app/v1/analysis/facility/workbench/results/calculation/facility-analysis-results-request';
import { facilityAnalysisGroupResultsFingerprint, projectAnalysisGroupDependencies, projectAnalysisGroupPredictorInputs } from '@app/v1/analysis/facility/workbench/group/results/calculation/facility-analysis-group-results-request';
import { UtilityDataSession } from '../utility/utility-data-session.service';

type Unavailable = Exclude<VisualizationSourceResolution, { readonly state: 'ready' | 'empty' }>;
export type AnalysisPreviewResult = { readonly state: 'ready'; readonly value: FacilityVisualizationResults } | Unavailable;

/** Only active previews acquire full results. Date resolution and projection share one acquisition. */
@Injectable()
export class AnalysisDataSession {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly data = inject(UtilityDataSession);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly pending = new WeakMap<AbortSignal, Promise<AnalysisPreviewResult>>();
  private readonly cache = new Map<string, { readonly fingerprint: string; readonly value: FacilityVisualizationResults }>();
  private readonly cancellations = new Set<() => void>();
  private session = 0;
  private lastSnapshot?: AccountWorkspaceSnapshot;
  constructor() {
    let account = this.workspace.isReady() ? this.workspace.account()?.guid : undefined;
    effect(() => {
      const current = this.workspace.isReady() ? this.workspace.account()?.guid : undefined;
      if (current !== account || !current) { account = current; this.session++; this.cache.clear(); for (const cancel of this.cancellations) cancel(); }
    });
    inject(DestroyRef).onDestroy(() => { this.session++; for (const cancel of this.cancellations) cancel(); this.cache.clear(); });
  }
  acquire(request: VisualizationSourceRequest, signal: AbortSignal): Promise<AnalysisPreviewResult> {
    const snapshot = this.workspace.snapshot();
    if (this.lastSnapshot && snapshot !== this.lastSnapshot && this.workspace.revision() === 0) { this.session++; this.cache.clear(); }
    this.lastSnapshot = snapshot;
    const existing = this.pending.get(signal);
    if (existing) return existing;
    const promise = this.calculate(request, signal);
    this.pending.set(signal, promise);
    return promise;
  }
  private async calculate(request: VisualizationSourceRequest, signal: AbortSignal): Promise<AnalysisPreviewResult> {
    const { identity, source } = request;
    const unavailable = (state: 'unsupported' | 'invalid-analysis' | 'error', message: string): Unavailable => ({ identity, state, message });
    const snapshot = this.workspace.snapshot();
    const current = () => !!snapshot && snapshot === this.workspace.snapshot() && !signal.aborted && this.workspace.isReady() && this.workspace.account()?.guid === identity.accountGuid && this.workspace.revision() === identity.workspaceRevision;
    if (!snapshot || !current()) return unavailable('error', 'Analysis preview canceled or superseded.');
    if (source.kind !== 'analysis' || source.mode !== 'result') return unavailable('unsupported', 'Saved model visualizations are not supported yet.');
    const analysis = snapshot.facilityAnalyses.find(item => item.guid === source.analysisGuid && item.accountId === identity.accountGuid);
    if (!analysis && snapshot.accountAnalyses.some(item => item.guid === source.analysisGuid)) return unavailable('unsupported', 'Account analysis visualizations are not supported yet.');
    const facility = snapshot.facilities.find(item => item.guid === analysis?.facilityId && item.accountId === identity.accountGuid);
    const missing = (kind: 'analysis' | 'analysis-group', id: string): Unavailable => ({ identity, state: 'missing-source', references: [{ kind, id }], message: 'Repair the named analysis/group within the included facilities.' });
    if (!analysis || !facility || !identity.scope.facilityGuids.includes(facility.guid)) return missing('analysis', source.analysisGuid ?? '');
    const group = source.groupGuid ? analysis.groups.find(item => item.idbGroupId === source.groupGuid) : undefined;
    if (source.groupGuid && (!group || ['skip', 'skipAnalysis'].includes(group.analysisType))) return missing('analysis-group', source.groupGuid);
    if (source.measure.startsWith('banked-') && !(analysis.hasBanking && group?.applyBanking)) return unavailable('unsupported', 'Choose a group with applicable banking.');
    // Reject broken closure explicitly before any recursive calculation can run.
    const visited = new Set<string>();
    let dependency = analysis;
    while (dependency) {
      if (visited.has(dependency.guid)) return unavailable('invalid-analysis', 'The analysis banking dependencies contain a cycle.');
      visited.add(dependency.guid);
      if (!dependency.hasBanking) break;
      const next = snapshot.facilityAnalyses.find(item => item.guid === dependency.bankedAnalysisItemId && item.accountId === identity.accountGuid && item.facilityId === facility.guid);
      if (!next) return unavailable('invalid-analysis', 'A banked analysis is unavailable. Review Analysis setup.');
      dependency = next;
    }
    try {
      const acquired = await this.data.acquire(identity, signal, true);
      if (!current()) return unavailable('error', 'Analysis inputs changed. Preparing current results.');
      const base = acquired.base;
      if (!base || base.state !== 'ready' || base.inputFingerprint !== this.calendarization.currentInputFingerprint()) return unavailable('error', 'Current calculation data is unavailable.');
      const evaluation = evaluateWorkspaceStatus({ snapshot, calendarizedMeters: base.meters, revision: identity.workspaceRevision, asOfDate: new Date() });
      const errors = evaluation.findings.filter(item => item.severity === 'error');
      const setupBlocked = errors.some(item => item.entity.kind === 'facility-analysis' && item.entity.guid === analysis.guid);
      const groupBlocked = errors.some(item => item.entity.kind === 'analysis-group' && item.entity.guid === `${analysis.guid}:${source.groupGuid}`);
      const facilityBlocked = setupBlocked || errors.some(item => item.entity.kind === 'analysis-group' && item.entity.guid.startsWith(`${analysis.guid}:`));
      if (setupBlocked || (source.groupGuid ? groupBlocked : facilityBlocked)) return unavailable('invalid-analysis', 'Analysis setup or the selected results are invalid. Review Analysis setup.');
      const groupOnly = !!source.groupGuid && facilityBlocked;
      let fullRequest: FacilityAnalysisResultsWorkerRequest | undefined, groupRequest: FacilityAnalysisGroupResultsWorkerRequest | undefined;
      if (groupOnly) {
        const dependencies = projectAnalysisGroupDependencies(analysis, source.groupGuid!, snapshot.facilityAnalyses.filter(item => item.accountId === identity.accountGuid && item.facilityId === facility.guid));
        const projection = this.calendarization.project(base, { context: { kind: 'facility', guid: facility.guid },
          meterGuids: snapshot.meters.filter(item => item.facilityId === facility.guid && item.groupId === source.groupGuid).map(item => item.guid),
          energyUnit: analysis.energyUnit, waterUnit: analysis.waterUnit, energyIsSource: analysis.energyIsSource, includeEmissions: false });
        if (projection.state !== 'ready') return unavailable('error', 'Current group calculation data is unavailable.');
        const predictors = projectAnalysisGroupPredictorInputs(facility.guid, dependencies, snapshot.predictorData, snapshot.predictors);
        groupRequest = { analysisItem: dependencies[0], facility: structuredClone(facility), groupGuid: source.groupGuid!,
          accountAnalysisItems: dependencies, calanderizedMeters: projection.meters, accountPredictorEntries: predictors.entries, accountPredictors: predictors.predictors };
      } else {
        const built = buildFacilityDashboardResultsRequest(analysis, facility, snapshot, input => this.calendarization.project(base, input));
        if (!built) return unavailable('error', 'Current facility calculation data is unavailable.');
        fullRequest = { ...built, includeGroupSummaries: true };
      }
      const fingerprint = groupRequest ? facilityAnalysisGroupResultsFingerprint(groupRequest) : facilityAnalysisResultsFingerprint(fullRequest!);
      const key = `${identity.accountGuid}:${identity.definitionGuid}`;
      const cached = this.cache.get(key);
      // Target identity is projection intent; full facility work can serve a different selected group.
      let value: FacilityVisualizationResults;
      if (cached?.fingerprint === fingerprint) value = { ...cached.value, analysis, facility };
      else {
        const runSession = this.session;
        const result = await this.run(fullRequest, groupRequest, signal);
        if (!current() || runSession !== this.session) return unavailable('error', 'Analysis preview canceled or superseded.');
        if (result.ok === false) return unavailable('error', result.message);
        if (groupOnly !== ('groupGuid' in result.value)) return unavailable('error', 'The calculation returned a mismatched result scope.');
        if (result.value.itemId !== analysis.guid) return unavailable('error', 'The calculation returned a mismatched analysis.');
        if ('groupGuid' in result.value) {
          if (result.value.groupGuid !== source.groupGuid) return unavailable('error', 'The calculation returned a mismatched group.');
          value = { analysis, facility, annual: result.value.annualAnalysisSummaryData, monthly: result.value.monthlyAnalysisSummaryData, groups: [], reportYear: result.value.reportYear, groupOnly: true };
        } else value = { analysis, facility, annual: result.value.annualAnalysisSummaries, monthly: result.value.monthlyAnalysisSummaryData, groups: result.value.groupSummaries ?? [], reportYear: result.value.reportYear, groupOnly: false };
        this.cache.clear();
        this.cache.set(key, { fingerprint, value });
      }
      if (!current()) return unavailable('error', 'Analysis preview canceled or superseded.');
      if (source.groupGuid && !groupOnly) {
        const selected = value.groups.find(item => item.group.idbGroupId === source.groupGuid);
        if (!selected) return unavailable('error', 'The calculation did not return the named group.');
        value = { ...value, annual: selected.annualAnalysisSummaryData, monthly: selected.monthlyAnalysisSummaryData };
      }
      return { state: 'ready', value: { ...value, groupLabel: snapshot.meterGroups.find(item => item.guid === source.groupGuid && item.facilityId === facility.guid)?.name } };
    } catch (error) { return unavailable('error', error instanceof Error ? error.message : 'Analysis calculation failed. Retry from current inputs.'); }
  }
  private run(full: FacilityAnalysisResultsWorkerRequest | undefined, group: FacilityAnalysisGroupResultsWorkerRequest | undefined, signal: AbortSignal): Promise<FacilityAnalysisResultsWorkerResponse | FacilityAnalysisGroupResultsWorkerResponse> {
    const response: Observable<FacilityAnalysisResultsWorkerResponse | FacilityAnalysisGroupResultsWorkerResponse> = typeof Worker === 'undefined'
      ? of(group ? { ok: true as const, value: calculateFacilityAnalysisGroupResults(group) } : { ok: true as const, value: calculateFacilityAnalysisResults(full!) })
      : group ? runWorker<FacilityAnalysisGroupResultsWorkerResponse>(new Worker(new URL('../../../platform/web-workers/facility-analysis-group-results.worker', import.meta.url)), group)
        : runWorker<FacilityAnalysisResultsWorkerResponse>(new Worker(new URL('../../../platform/web-workers/facility-analysis-results.worker', import.meta.url)), full);
    return new Promise((resolve, reject) => {
      let subscription: Subscription | undefined;
      const cancel = () => { subscription?.unsubscribe(); cleanup(); reject(new DOMException('Analysis preview canceled', 'AbortError')); };
      const cleanup = () => { signal.removeEventListener('abort', cancel); this.cancellations.delete(cancel); };
      signal.addEventListener('abort', cancel, { once: true }); this.cancellations.add(cancel);
      subscription = response.pipe(timeout(CALCULATION_WORKER_TIMEOUT_MS)).subscribe({ next: result => { cleanup(); resolve(result); }, error: error => { cleanup(); reject(error); } });
      if (signal.aborted) cancel();
    });
  }
}

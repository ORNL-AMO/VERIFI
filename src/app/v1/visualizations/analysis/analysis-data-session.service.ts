import { presentFindings } from '@app/v1/status/status.catalog';
import type { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { calculateAccountAnalysisResults } from '@domain/calculations/analysis-calculations/account-analysis-results-calculation';
import type { AccountAnalysisResultsWorkerRequest, AccountAnalysisResultsWorkerResponse } from '@platform/web-workers/account-analysis-results-worker.contract';
import { buildAccountAnalysisResultsRequest, accountAnalysisResultsFingerprint } from '@app/v1/analysis/account/results/account-analysis-results-request';
import { buildFacilitySelectionItems } from '@app/v1/analysis/account/workbench/select-facility-items/account-analysis-facility-selection.models';
import { DestroyRef, Injectable, effect, inject } from '@angular/core';
import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { VisualizationSourceRequest, VisualizationSourceResolution } from '@domain/visualizations/visualization-source-provider';
import { accountAnalysisInclusionIssue, type AccountVisualizationResults, type AnalysisVisualizationResults, type FacilityVisualizationResults } from '@domain/visualizations/analysis/facility-analysis-source';
import { calculateFacilityAnalysisResults } from '@domain/calculations/analysis-calculations/facility-analysis-results-calculation';
import { calculateFacilityAnalysisGroupResults } from '@domain/calculations/analysis-calculations/facility-analysis-group-results-calculation';
import type { FacilityAnalysisResultsWorkerRequest, FacilityAnalysisResultsWorkerResponse } from '@platform/web-workers/facility-analysis-results-worker.contract';
import type { FacilityAnalysisGroupResultsWorkerRequest, FacilityAnalysisGroupResultsWorkerResponse } from '@platform/web-workers/facility-analysis-group-results-worker.contract';
import { CALCULATION_WORKER_TIMEOUT_MS, runWorker } from '@platform/web-workers/run-worker';
import { of, timeout, type Observable, type Subscription } from 'rxjs';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { evaluateWorkspaceStatus } from '@app/v1/status/status.evaluator';
import { evaluateBankingSource } from '@shared/shared-analysis/banking-configuration';
import { buildFacilityDashboardResultsRequest, facilityAnalysisResultsFingerprint } from '@app/v1/analysis/facility/workbench/results/calculation/facility-analysis-results-request';
import { facilityAnalysisGroupResultsFingerprint, projectAnalysisGroupDependencies, projectAnalysisGroupPredictorInputs } from '@app/v1/analysis/facility/workbench/group/results/calculation/facility-analysis-group-results-request';
import { UtilityDataSession } from '../utility/utility-data-session.service';

type Unavailable = Exclude<VisualizationSourceResolution, { readonly state: 'ready' | 'empty' }>;
export type AnalysisPreviewResult = { readonly state: 'ready'; readonly value: AnalysisVisualizationResults } | Unavailable;

/** Only active previews acquire full results. Date resolution and projection share one acquisition. */
@Injectable()
export class AnalysisDataSession {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly data = inject(UtilityDataSession);
  private readonly calendarization = inject(WorkspaceCalendarizationService);
  private readonly pending = new WeakMap<AbortSignal, Map<string, Promise<AnalysisPreviewResult>>>();
  private readonly cache = new Map<string, { readonly fingerprint: string; readonly value: AnalysisVisualizationResults }>();
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
    const requests = this.pending.get(signal) ?? new Map<string, Promise<AnalysisPreviewResult>>();
    const source = request.source;
    const key = source.kind === 'analysis' && source.mode === 'result' ? JSON.stringify([source.kind, source.analysisGuid, source.groupGuid]) : JSON.stringify(source);
    const existing = requests.get(key);
    if (existing) return existing.then(result => result.state === 'ready' ? result : { ...result, identity: request.identity });
    const promise = this.calculate(request, signal);
    requests.set(key, promise);
    this.pending.set(signal, requests);
    return promise;
  }
  private async calculate(request: VisualizationSourceRequest, signal: AbortSignal): Promise<AnalysisPreviewResult> {
    const { identity, source } = request;
    const unavailable = (state: 'unsupported' | 'invalid-analysis' | 'error', message: string): Unavailable => ({ identity, state, message });
    const snapshot = this.workspace.snapshot();
    const current = () => !!snapshot && snapshot === this.workspace.snapshot() && !signal.aborted && this.workspace.isReady() && this.workspace.account()?.guid === identity.accountGuid && this.workspace.revision() === identity.workspaceRevision;
    if (!snapshot || !current()) return unavailable('error', 'Analysis preview canceled or superseded.');
    if (source.kind !== 'analysis' || source.mode !== 'result') return unavailable('unsupported', 'Saved model visualizations are not supported yet.');
    const accountAnalysis = snapshot.accountAnalyses.find(item => item.guid === source.analysisGuid && item.accountId === identity.accountGuid);
    if (accountAnalysis) return this.calculateAccount(accountAnalysis, snapshot, request, signal);
    const analysis = snapshot.facilityAnalyses.find(item => item.guid === source.analysisGuid && item.accountId === identity.accountGuid);
    const facility = snapshot.facilities.find(item => item.guid === analysis?.facilityId && item.accountId === identity.accountGuid);
    const missing = (kind: 'analysis' | 'analysis-group', id: string): Unavailable => ({ identity, state: 'missing-source', references: [{ kind, id }], message: 'Repair the named analysis/group within the included facilities.' });
    if (!analysis || !facility || !identity.scope.facilityGuids.includes(facility.guid)) return missing('analysis', source.analysisGuid ?? '');
    const group = source.groupGuid ? analysis.groups.find(item => item.idbGroupId === source.groupGuid) : undefined;
    if (source.groupGuid && (!group || ['skip', 'skipAnalysis'].includes(group.analysisType))) return missing('analysis-group', source.groupGuid);
    if (source.measure.startsWith('banked-') && !(analysis.hasBanking && group?.applyBanking)) return unavailable('unsupported', 'Choose a group with applicable banking.');
    // Reject broken closure explicitly before any recursive calculation can run.
    const bankingIssue = analysis.hasBanking ? evaluateBankingSource(analysis,
      snapshot.facilityAnalyses.filter(item => item.accountId === identity.accountGuid && item.facilityId === facility.guid)).issue : undefined;
    if (bankingIssue === 'cycle') return unavailable('invalid-analysis', 'The analysis banking dependencies contain a cycle.');
    if (bankingIssue === 'missing' || bankingIssue === 'dependency-missing') return unavailable('invalid-analysis', 'A banked analysis is unavailable. Review Analysis setup.');
    if (bankingIssue) return unavailable('invalid-analysis', 'Analysis setup or the selected results are invalid. Review Analysis setup.');
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
      const key = JSON.stringify(['facility', identity.accountGuid, fingerprint]);
      const cached = this.readCached(key);
      // Target identity is projection intent; full facility work can serve a different selected group.
      let value: FacilityVisualizationResults;
      if (cached?.fingerprint === fingerprint && cached.value.scope === 'facility') value = { ...cached.value, analysis, facility };
      else {
        const runSession = this.session;
        const result = await this.run(fullRequest, groupRequest, signal);
        if (!current() || runSession !== this.session) return unavailable('error', 'Analysis preview canceled or superseded.');
        if (result.ok === false) return unavailable('error', result.message);
        if (groupOnly !== ('groupGuid' in result.value)) return unavailable('error', 'The calculation returned a mismatched result scope.');
        if (result.value.itemId !== analysis.guid) return unavailable('error', 'The calculation returned a mismatched analysis.');
        if ('groupGuid' in result.value) {
          if (result.value.groupGuid !== source.groupGuid) return unavailable('error', 'The calculation returned a mismatched group.');
          value = { scope: 'facility', analysis, facility, annual: result.value.annualAnalysisSummaryData, monthly: result.value.monthlyAnalysisSummaryData, groups: [], reportYear: result.value.reportYear, groupOnly: true };
        } else value = { scope: 'facility', analysis, facility, annual: result.value.annualAnalysisSummaries, monthly: result.value.monthlyAnalysisSummaryData, groups: result.value.groupSummaries ?? [], reportYear: result.value.reportYear, groupOnly: false };
        this.remember(key, fingerprint, value);
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
  private readCached(key: string) {
    const cached = this.cache.get(key);
    if (cached) { this.cache.delete(key); this.cache.set(key, cached); }
    return cached;
  }
  private remember(key: string, fingerprint: string, value: AnalysisVisualizationResults): void {
    this.cache.delete(key);
    this.cache.set(key, { fingerprint, value });
    // Keep distinct selected analyses reusable without retaining unbounded Worker result graphs.
    while (this.cache.size > 16) this.cache.delete(this.cache.keys().next().value!);
  }
  private async calculateAccount(analysis: IdbAccountAnalysisItem, snapshot: AccountWorkspaceSnapshot, request: VisualizationSourceRequest, signal: AbortSignal): Promise<AnalysisPreviewResult> {
    const { identity, source } = request;
    const unavailable = (state: 'unsupported' | 'invalid-analysis' | 'error', message: string): Unavailable => ({ identity, state, message });
    const current = () => snapshot === this.workspace.snapshot() && !signal.aborted && this.workspace.isReady()
      && this.workspace.account()?.guid === identity.accountGuid && this.workspace.revision() === identity.workspaceRevision;
    if (source.kind !== 'analysis' || source.mode !== 'result' || source.groupGuid || source.measure.startsWith('banked-')) {
      return unavailable('unsupported', 'Account totals do not support group targets or separate banked measures.');
    }
    const facilities = snapshot.facilities.filter(item => item.accountId === identity.accountGuid);
    const links = analysis.facilityAnalysisItems ?? [];
    if (new Set(links.map(link => link.facilityId)).size !== links.length || links.some(link => !facilities.some(item => item.guid === link.facilityId))) {
      return unavailable('invalid-analysis', 'A saved facility selection is invalid or unavailable. Review Analysis selections.');
    }
    const selected = links.filter(link => link.analysisItemId && link.analysisItemId !== 'skip');
    const selectedFacilityGuids = selected.map(link => link.facilityId);
    const inclusion = accountAnalysisInclusionIssue(selectedFacilityGuids, identity.scope.facilityGuids);
    if (inclusion) return unavailable('unsupported', inclusion);
    const analyses = snapshot.facilityAnalyses.filter(item => item.accountId === identity.accountGuid);
    for (const link of selected) {
      const selectedAnalysis = analyses.find(item => item.guid === link.analysisItemId && item.facilityId === link.facilityId);
      if (!selectedAnalysis) return unavailable('invalid-analysis', 'A selected facility analysis is unavailable. Review Analysis selections.');
      const bankingIssue = selectedAnalysis.hasBanking ? evaluateBankingSource(selectedAnalysis,
        analyses.filter(item => item.facilityId === link.facilityId)).issue : undefined;
      if (bankingIssue === 'cycle') return unavailable('invalid-analysis', 'The analysis banking dependencies contain a cycle.');
      if (bankingIssue === 'missing' || bankingIssue === 'dependency-missing') return unavailable('invalid-analysis', 'A banked analysis is unavailable. Review Analysis setup.');
      if (bankingIssue) return unavailable('invalid-analysis', 'Analysis setup or facility selections are invalid. Review Analysis setup.');
    }
    try {
      const acquired = await this.data.acquire(identity, signal, true);
      if (!current()) return unavailable('error', 'Analysis inputs changed. Preparing current results.');
      const base = acquired.base;
      if (!base || base.state !== 'ready' || base.inputFingerprint !== this.calendarization.currentInputFingerprint()) return unavailable('error', 'Current calculation data is unavailable.');
      const evaluation = evaluateWorkspaceStatus({ snapshot, calendarizedMeters: base.meters, revision: identity.workspaceRevision, asOfDate: new Date() });
      const selections = buildFacilitySelectionItems(analysis, facilities, analyses, presentFindings(evaluation.findings), 'ready');
      const blocked = evaluation.findings.some(item => item.severity === 'error' && item.entity.kind === 'account-analysis' && item.entity.guid === analysis.guid);
      if (blocked || !selections.length || selections.some(item => !item.assigned || item.state === 'error')) {
        return unavailable('invalid-analysis', 'Analysis setup or facility selections are invalid. Review Analysis setup.');
      }
      const metadata = { scope: 'account' as const, analysis, account: snapshot.account, selectedFacilityGuids };
      if (!selected.length) return { state: 'ready', value: { ...metadata, monthly: [], annual: [] } };
      const built = buildAccountAnalysisResultsRequest(analysis, snapshot);
      const fingerprint = accountAnalysisResultsFingerprint(built), key = JSON.stringify(['account', identity.accountGuid, fingerprint]);
      const cached = this.readCached(key);
      let value: AccountVisualizationResults;
      if (cached?.fingerprint === fingerprint && cached.value.scope === 'account') value = { ...cached.value, ...metadata };
      else {
        const runSession = this.session;
        const result = await this.runAccount(built, signal);
        if (!current() || runSession !== this.session) return unavailable('error', 'Analysis preview canceled or superseded.');
        if (result.ok === false) return unavailable('error', result.message);
        if (result.value.itemId !== analysis.guid || !Array.isArray(result.value.facilitySummaries)
          || result.value.facilitySummaries.length !== selected.length
          || selected.some(link => !result.value.facilitySummaries!.some(item => item.facilityGuid === link.facilityId && item.analysisGuid === link.analysisItemId))) {
          return unavailable('error', 'The calculation returned mismatched account results.');
        }
        value = { ...metadata, monthly: result.value.monthlyAnalysisSummaryData, annual: result.value.annualAnalysisSummaries, reportYear: result.value.reportYear };
        this.remember(key, fingerprint, value);
      }
      return current() ? { state: 'ready', value } : unavailable('error', 'Analysis preview canceled or superseded.');
    } catch (error) { return unavailable('error', error instanceof Error ? error.message : 'Analysis calculation failed. Retry from current inputs.'); }
  }
  private runAccount(request: AccountAnalysisResultsWorkerRequest, signal: AbortSignal): Promise<AccountAnalysisResultsWorkerResponse> {
    const response = typeof Worker === 'undefined' ? of({ ok: true as const, value: calculateAccountAnalysisResults(request) })
      : runWorker<AccountAnalysisResultsWorkerResponse>(new Worker(new URL('../../../platform/web-workers/account-analysis-workbench-results.worker', import.meta.url)), request);
    return this.consume(response, signal);
  }
  private run(full: FacilityAnalysisResultsWorkerRequest | undefined, group: FacilityAnalysisGroupResultsWorkerRequest | undefined, signal: AbortSignal): Promise<FacilityAnalysisResultsWorkerResponse | FacilityAnalysisGroupResultsWorkerResponse> {
    const response: Observable<FacilityAnalysisResultsWorkerResponse | FacilityAnalysisGroupResultsWorkerResponse> = typeof Worker === 'undefined'
      ? of(group ? { ok: true as const, value: calculateFacilityAnalysisGroupResults(group) } : { ok: true as const, value: calculateFacilityAnalysisResults(full!) })
      : group ? runWorker<FacilityAnalysisGroupResultsWorkerResponse>(new Worker(new URL('../../../platform/web-workers/facility-analysis-group-results.worker', import.meta.url)), group)
        : runWorker<FacilityAnalysisResultsWorkerResponse>(new Worker(new URL('../../../platform/web-workers/facility-analysis-results.worker', import.meta.url)), full);
    return this.consume(response, signal);
  }
  private consume<T>(response: Observable<T>, signal: AbortSignal): Promise<T> {
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

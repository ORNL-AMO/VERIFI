import { isExplorationChart, visualizationInterval } from '@domain/visualizations/visualization-interval';
import { resolveAccountAnalysisResults, resolveFacilityAnalysisResults } from '@domain/visualizations/analysis/facility-analysis-source';
import { AnalysisDataSession } from '../analysis/analysis-data-session.service';
import { analysisPeriodIssue, latestAnalysisMonth } from '@domain/visualizations/analysis/facility-analysis-source';
import { civilMonthIndex, civilMonthRange, wholeMonthWindow } from '@domain/visualizations/visualization-periods';
import { latestPredictorDate, predictorHistoryRange, resolvePredictor } from '@domain/visualizations/predictor/predictor-source';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { Injectable, inject } from '@angular/core';
import type { VisualizationDefinition, UtilityVisualizationSource } from '@domain/visualizations/visualization-definition';
import { civilDate, validCivil } from '@domain/visualizations/utility/utility-periods';
import type { PreviewDateContextResolver, PreviewIdentity, PreviewDateContext } from './preview-registry';
import { UtilityDataSession } from '../utility/utility-data-session.service';
import { UtilitySourceProvider } from '../utility/utility-source-provider.service';

@Injectable()
export class VisualizationDateContextResolver implements PreviewDateContextResolver {
  private readonly analysisData = inject(AnalysisDataSession, { optional: true });
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly data = inject(UtilityDataSession);
  private readonly provider = inject(UtilitySourceProvider);
  async resolve(definition: VisualizationDefinition, identity: PreviewIdentity, signal: AbortSignal): Promise<PreviewDateContext> {
    if (isExplorationChart(definition.chart)) return this.explorationDates(definition, identity, signal);
    const scope = resolveVisualizationFacilities(definition, this.workspace.facilities()).scope;
    const sources = definition.sources.filter((s): s is UtilityVisualizationSource => s.kind === 'utility');
    const predictors = definition.sources.filter(source => source.kind === 'predictor');
    const analysis = definition.sources.find(source => source.kind === 'analysis');
    if (analysis && definition.sources.length === 1 && this.analysisData) {
      const calendarDate = civilDate(new Date());
      if (analysisPeriodIssue({ chart: definition.chart!, period: definition.period, comparison: definition.comparison })) return { calendarDate };
      const result = await this.analysisData.acquire({ identity: { ...identity, scope, sourceId: analysis.id, requestId: 'date-context' },
        source: analysis, chart: definition.chart!, period: definition.period, comparison: definition.comparison, series: definition.series, dateContext: { calendarDate } }, signal);
      if (signal.aborted || !this.workspace.isReady() || this.workspace.account()?.guid !== identity.accountGuid || this.workspace.revision() !== identity.workspaceRevision) throw new DOMException('Analysis date context superseded', 'AbortError');
      return { calendarDate, ...(result.state === 'ready' ? { latestDataDate: latestAnalysisMonth(result.value) } : {}) };
    }
    if (!sources.length && !predictors.length) {
      if (signal.aborted || !this.workspace.isReady() || this.workspace.account()?.guid !== identity.accountGuid || this.workspace.revision() !== identity.workspaceRevision)
        throw new DOMException('Date context superseded', 'AbortError');
      return { calendarDate: civilDate(new Date()) };
    }
    // Establish shared calculation demand before any native or calendarized provider uses this signal.
    if (sources.length) await this.data.acquire(identity, signal, sources.some(s => s.dataMode === 'calendarized'), this.data.requiresGrid(sources, scope));
    const calendarDate = civilDate(new Date());
    const snapshot = this.workspace.snapshot();
    const current = () => !signal.aborted && this.workspace.isReady() && this.workspace.account()?.guid === identity.accountGuid
      && this.workspace.revision() === identity.workspaceRevision && (!sources.length || this.data.isCurrent(identity));
    if (!snapshot || !current()) throw new DOMException('Date context superseded', 'AbortError');
    const needsLatest = definition.period.kind === 'rolling' && definition.period.anchor === 'latest-data';
    let latestDataDate = needsLatest ? predictors.flatMap(source => latestPredictorDate(snapshot, scope, source) ?? []).sort().at(-1) : undefined;
    const emptyReasons: string[] = [];
    let sourceUnavailable = false;
    const histories = definition.period.kind === 'all-history' ? predictors.flatMap(source => predictorHistoryRange(snapshot, scope, source) ?? []) : [];
    if (definition.period.kind === 'rolling' && definition.period.anchor === 'latest-data' || predictors.length && definition.period.kind === 'all-history') for (const source of sources) {
      // Use the same ownership, allocation, retirement and measure-quality gates as the preview.
      const result = await this.provider.resolve({ identity: { ...identity, scope, sourceId: source.id, requestId: 'date-context' }, source,
        chart: { kind: 'time-series', defaultTraceType: 'line', interval: source.dataMode === 'calendarized' ? 'monthly' : 'native', stack: 'none' },
        period: { kind: 'all-history' }, comparison: { kind: 'none' }, series: definition.series, dateContext: { calendarDate } }, signal);
      if (!current()) throw new DOMException('Date context superseded', 'AbortError');
      if (result.state !== 'ready' && result.state !== 'empty') sourceUnavailable = true;
      if (result.state === 'empty') emptyReasons.push(...result.reasons ?? [result.message]);
      if (result.state !== 'ready' || result.resolved.data.kind !== 'time-series') continue;
      emptyReasons.push(...result.resolved.quality?.warnings ?? []);
      if (predictors.length) histories.push(...result.resolved.periods.map(period => ({ start: period.start, end: period.end })));
      for (const row of result.resolved.data.rows) if (validCivil(row.end) && Object.values(row.values).some(value => value.state === 'observed')
        && (!latestDataDate || row.end > latestDataDate)) latestDataDate = row.end;
    }
    let monthlyRange: PreviewDateContext['monthlyRange'];
    if (predictors.length) {
      const period = definition.period;
      if (period.kind === 'fixed') monthlyRange = wholeMonthWindow(period.start, period.end);
      if (period.kind === 'all-history' && histories.length) monthlyRange = wholeMonthWindow(
        histories.map(range => range.start).sort()[0], histories.map(range => range.end).sort().at(-1)!);
      if (period.kind === 'rolling') {
        const anchor = period.anchor === 'latest-data' ? latestDataDate : calendarDate;
        if (anchor) {
          const last = civilMonthIndex(anchor) - (period.anchor === 'calendar' ? 1 : 0);
          const first = last - period.count * (period.unit === 'year' ? 12 : 1) + 1;
          if (first >= 12 && last <= 119999) monthlyRange = { start: civilMonthRange(first).start, end: civilMonthRange(last).end };
        }
      }
    }
    const noAnchor = predictors.length && definition.period.kind === 'rolling' && definition.period.anchor === 'latest-data' && !latestDataDate;
    if (noAnchor) for (const source of predictors) {
      const result = resolvePredictor(snapshot, { identity: { ...identity, scope, sourceId: source.id, requestId: 'empty-date-context' }, source,
        chart: definition.chart!, period: { kind: 'all-history' }, comparison: { kind: 'none' }, series: definition.series.filter(series => series.sourceId === source.id), dateContext: { calendarDate } });
      if (result.state !== 'ready' && result.state !== 'empty') sourceUnavailable = true;
      if (result.state === 'empty') emptyReasons.push(...result.reasons ?? [result.message]);
    }
    if (!current()) throw new DOMException('Date context superseded', 'AbortError');
    return { calendarDate, ...(latestDataDate ? { latestDataDate } : {}), ...(monthlyRange ? { monthlyRange } : {}), ...(noAnchor && !sourceUnavailable ? { emptyReasons: emptyReasons.length ? emptyReasons : ['No eligible saved observations are available.'] } : {}) };
  }
  private async explorationDates(definition: VisualizationDefinition, identity: PreviewIdentity, signal: AbortSignal): Promise<PreviewDateContext> {
    if (visualizationInterval(definition.chart) !== 'monthly') {
      // Annual sources keep their own interval bounds. Discover rolling anchors
      // through the existing monthly history path, never a padded annual end date.
      return this.resolve({ ...definition,
        chart: { kind: 'time-series', defaultTraceType: 'line', interval: 'yearly', stack: 'none' }
      }, identity, signal);
    }
    const calendarDate = civilDate(new Date());
    const snapshot = this.workspace.snapshot();
    const scope = resolveVisualizationFacilities(definition, this.workspace.facilities()).scope;
    const current = () => { if (signal.aborted || !snapshot || this.workspace.snapshot() !== snapshot) throw new DOMException('Date context superseded', 'AbortError'); };
    current();
    const utilities = definition.sources.filter((source): source is UtilityVisualizationSource => source.kind === 'utility');
    if (utilities.length) await this.data.acquire(identity, signal, true, this.data.requiresGrid(utilities, scope));
    current();
    const histories: { start: string; end: string }[] = [];
    const latest: string[] = [];
    const reasons: string[] = [];
    for (const source of definition.sources) {
      current();
      const request = { identity: { ...identity, scope, sourceId: source.id, requestId: 'exploration-dates' }, source,
        chart: definition.chart!, period: { kind: 'all-history' as const }, comparison: { kind: 'none' as const }, series: definition.series, dateContext: { calendarDate } };
      let result: import('@domain/visualizations/visualization-source-provider').VisualizationSourceResolution | undefined;
      if (source.kind === 'utility') result = await this.provider.resolve(request, signal);
      else if (source.kind === 'predictor') {
        const range = predictorHistoryRange(snapshot!, scope, source), end = latestPredictorDate(snapshot!, scope, source);
        if (range) histories.push(range);
        if (end) latest.push(end);
        continue;
      } else if (source.kind === 'analysis' && this.analysisData) {
        const acquired = await this.analysisData.acquire(request, signal);
        if (acquired.state === 'ready') {
          const end = latestAnalysisMonth(acquired.value); if (end) latest.push(end);
          result = acquired.value.scope === 'account' ? resolveAccountAnalysisResults(acquired.value, request) : resolveFacilityAnalysisResults(acquired.value, request);
        }
      }
      current();
      if (result?.state === 'ready' || result?.state === 'empty') {
        const resolved = result.resolved;
        if (resolved?.data.kind === 'time-series') {
          histories.push(...resolved.periods);
          for (const row of resolved.data.rows) if (Object.values(row.values).some(value => value.state === 'observed' && Number.isFinite(value.value))) latest.push(row.end);
        }
        if (result.state === 'empty') reasons.push(...result.reasons ?? [result.message]);
      }
    }
    current();
    const latestDataDate = latest.sort().at(-1), period = definition.period;
    let monthlyRange: PreviewDateContext['monthlyRange'];
    if (period.kind === 'fixed') monthlyRange = wholeMonthWindow(period.start, period.end);
    if (period.kind === 'all-history' && histories.length) monthlyRange = wholeMonthWindow(histories.map(range => range.start).sort()[0], histories.map(range => range.end).sort().at(-1)!);
    if (period.kind === 'rolling') {
      const anchor = period.anchor === 'calendar' ? calendarDate : latestDataDate;
      if (anchor) {
        const last = civilMonthIndex(anchor) - (period.anchor === 'calendar' ? 1 : 0), first = last - period.count * (period.unit === 'year' ? 12 : 1) + 1;
        if (first >= 12 && last <= 119999) monthlyRange = { start: civilMonthRange(first).start, end: civilMonthRange(last).end };
      }
    }
    return { calendarDate, ...(latestDataDate ? { latestDataDate } : {}), ...(monthlyRange ? { monthlyRange } : {}),
      ...(!latestDataDate ? { emptyReasons: reasons.length ? reasons : ['No eligible saved observation is available.'] } : {}) };
  }

}

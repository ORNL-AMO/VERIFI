import { wholeMonthWindow } from '@domain/visualizations/visualization-monthly-combination';
import { latestPredictorDate, predictorHistoryRange, predictorMonthRange, resolvePredictor } from '@domain/visualizations/predictor/predictor-source';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { Injectable, inject } from '@angular/core';
import type { VisualizationDefinition, UtilityVisualizationSource } from '@domain/visualizations/visualization-definition';
import { civilDate, validCivil } from '@domain/visualizations/utility/utility-periods';
import type { PreviewDateContextResolver, PreviewIdentity, PreviewDateContext } from '../preview/preview-registry';
import { UtilityDataSession } from './utility-data-session.service';
import { UtilitySourceProvider } from './utility-source-provider.service';

@Injectable()
export class UtilityDateContextResolver implements PreviewDateContextResolver {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly data = inject(UtilityDataSession);
  private readonly provider = inject(UtilitySourceProvider);
  async resolve(definition: VisualizationDefinition, identity: PreviewIdentity, signal: AbortSignal): Promise<PreviewDateContext> {
    const scope = resolveVisualizationFacilities(definition, this.workspace.facilities()).scope;
    const sources = definition.sources.filter((s): s is UtilityVisualizationSource => s.kind === 'utility');
    const predictors = definition.sources.filter(source => source.kind === 'predictor');
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
          const last = Number(anchor.slice(0, 4)) * 12 + Number(anchor.slice(5, 7)) - 1 - (period.anchor === 'calendar' ? 1 : 0);
          const first = last - period.count * (period.unit === 'year' ? 12 : 1) + 1;
          if (first >= 12 && last <= 119999) monthlyRange = { start: predictorMonthRange(first).start, end: predictorMonthRange(last).end };
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
}

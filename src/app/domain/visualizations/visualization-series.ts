import type { VisualizationDefinition, VisualizationSeries, VisualizationSeriesOverride } from './visualization-definition';
import type { ResolvedVisualizationSeries } from './visualization-source-provider';

export interface EffectiveVisualizationSeries {
  readonly selected: VisualizationSeries;
  readonly metadata: ResolvedVisualizationSeries;
}

/** Resource identity wins; foreign and unsupported provider-local preferences stay dormant. */
export function findVisualizationSeriesOverride(
  definition: Pick<VisualizationDefinition, 'accountGuid'> & Partial<Pick<VisualizationDefinition, 'sources'>>,
  selected: VisualizationSeries,
  target: Pick<ResolvedVisualizationSeries, 'id' | 'resourceGuid'>
): VisualizationSeriesOverride | undefined {
  const source = definition.sources?.find(source => source.id === selected.sourceId);
  const applicable = (override: VisualizationSeriesOverride) => (override.accountGuid ?? definition.accountGuid) === definition.accountGuid
    && !(source?.kind === 'analysis' && source.mode === 'result' && override.seriesId !== undefined);
  return selected.overrides?.find(override => applicable(override) && override.resourceGuid !== undefined && override.resourceGuid === target.resourceGuid)
    ?? selected.overrides?.find(override => applicable(override) && override.seriesId !== undefined && override.seriesId === target.id);
}

/**
 * Expand matching-set selections without persisting discovered resources. Exact declarations
 * take precedence over a wildcard; owner-qualified overrides supply presentation only.
 */
export function resolveVisualizationSeries(
  definition: Pick<VisualizationDefinition, 'accountGuid' | 'series'> & Partial<Pick<VisualizationDefinition, 'chart' | 'sources'>>,
  resolved: readonly ResolvedVisualizationSeries[],
  includeHidden = false
): readonly EffectiveVisualizationSeries[] {
  const sourceOrder = [...new Set(definition.series.map(selected => selected.sourceId))];
  const expanded = definition.series.flatMap(selected => {
    const matches = resolved.filter(candidate => candidate.sourceId === selected.sourceId && candidate.metric === selected.metric
      && (selected.resourceGuid === undefined || selected.resourceGuid === candidate.resourceGuid)
      && (selected.resourceGuid !== undefined || !definition.series.some(exact => exact.sourceId === candidate.sourceId
        && exact.metric === candidate.metric && exact.resourceGuid !== undefined && exact.resourceGuid === candidate.resourceGuid)));
    return matches.flatMap(metadata => {
      const override = findVisualizationSeriesOverride(definition, selected, metadata);
      const { overrides: _overrides, ...base } = selected;
      const { resourceGuid: _resourceGuid, seriesId: _seriesId, accountGuid: _accountGuid, order: _order, ...appearance } = override ?? {};
      const traceType = override?.traceType ?? base.traceType
        ?? (definition.chart?.kind === 'time-series' ? definition.chart.defaultTraceType : undefined);
      const effective: VisualizationSeries = { ...base, ...appearance, ...(traceType ? { traceType } : {}) };
      return !includeHidden && effective.visible === false ? [] : [{ selected: effective, metadata, order: override?.order }];
    });
  });
  const resources = [...new Set([...definition.series.flatMap(series => series.resourceGuid ? [series.resourceGuid] : []), ...resolved.map(series => series.resourceGuid ?? series.id)])];
  const kinds = [...new Set(definition.sources?.map(source => source.kind) ?? [])];
  const category = (sourceId: string) => Math.max(0, kinds.indexOf(definition.sources?.find(source => source.id === sourceId)?.kind!));
  return expanded.sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER)
    || category(left.metadata.sourceId) - category(right.metadata.sourceId)
    || resources.indexOf(left.metadata.resourceGuid ?? left.metadata.id) - resources.indexOf(right.metadata.resourceGuid ?? right.metadata.id)
    || sourceOrder.indexOf(left.metadata.sourceId) - sourceOrder.indexOf(right.metadata.sourceId))
    .map(({ selected, metadata }) => ({ selected, metadata }));
}

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
  // Item order spans exact and matching-set declarations, while source groups stay together.
  return sourceOrder.flatMap(sourceId => expanded.filter(item => item.metadata.sourceId === sourceId)
    .sort((left, right) => {
      if (left.order === right.order) return 0;
      if (left.order === undefined) return 1;
      if (right.order === undefined) return -1;
      return left.order - right.order;
    }).map(({ selected, metadata }) => ({ selected, metadata })));
}

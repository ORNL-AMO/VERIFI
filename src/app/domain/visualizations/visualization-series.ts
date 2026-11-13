import type { VisualizationDefinition, VisualizationSeries } from './visualization-definition';
import type { ResolvedVisualizationSeries } from './visualization-source-provider';

export interface EffectiveVisualizationSeries {
  readonly selected: VisualizationSeries;
  readonly metadata: ResolvedVisualizationSeries;
}

/**
 * Expand matching-set selections without persisting discovered resources. Exact declarations
 * take precedence over a wildcard; owner-qualified overrides supply presentation only.
 */
export function resolveVisualizationSeries(
  definition: Pick<VisualizationDefinition, 'accountGuid' | 'series'> & Partial<Pick<VisualizationDefinition, 'chart'>>,
  resolved: readonly ResolvedVisualizationSeries[],
  includeHidden = false
): readonly EffectiveVisualizationSeries[] {
  const sourceOrder = [...new Set(definition.series.map(selected => selected.sourceId))];
  const expanded = definition.series.flatMap(selected => {
    const matches = resolved.filter(candidate => candidate.sourceId === selected.sourceId && candidate.metric === selected.metric
      && (selected.resourceGuid === undefined || selected.resourceGuid === candidate.resourceGuid)
      && (selected.resourceGuid !== undefined || !definition.series.some(exact => exact.sourceId === candidate.sourceId
        && exact.metric === candidate.metric && exact.resourceGuid !== undefined && exact.resourceGuid === candidate.resourceGuid)));
    const overrides = (selected.overrides ?? []).filter(override => (override.accountGuid ?? definition.accountGuid) === definition.accountGuid);
    const matchingOverride = (metadata: ResolvedVisualizationSeries) => {
      // Domain resource identity wins over a provider-local category selector.
      const resource = overrides.find(override => override.resourceGuid !== undefined && override.resourceGuid === metadata.resourceGuid);
      return resource ?? overrides.find(override => override.seriesId !== undefined && override.seriesId === metadata.id);
    };
    return matches.flatMap(metadata => {
      const override = matchingOverride(metadata);
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

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
  definition: Pick<VisualizationDefinition, 'accountGuid' | 'series'>,
  resolved: readonly ResolvedVisualizationSeries[],
  includeHidden = false
): readonly EffectiveVisualizationSeries[] {
  return definition.series.flatMap(selected => {
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
    const ordered = [...matches].sort((left, right) => {
      const leftOrder = matchingOverride(left)?.order, rightOrder = matchingOverride(right)?.order;
      if (leftOrder === rightOrder) return 0;
      if (leftOrder === undefined) return 1;
      if (rightOrder === undefined) return -1;
      return leftOrder - rightOrder;
    });
    return ordered.flatMap(metadata => {
      const override = matchingOverride(metadata);
      const { overrides: _overrides, ...base } = selected;
      const { resourceGuid: _resourceGuid, seriesId: _seriesId, accountGuid: _accountGuid, order: _order, ...appearance } = override ?? {};
      const effective: VisualizationSeries = { ...base, ...appearance };
      return !includeHidden && effective.visible === false ? [] : [{ selected: effective, metadata }];
    });
  });
}

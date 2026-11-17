import type { VisualizationDefinition, VisualizationSeries, VisualizationSeriesOverride } from '@domain/visualizations/visualization-definition';
import { findVisualizationSeriesOverride } from '@domain/visualizations/visualization-series';
import type { DecisionItemAppearance, DecisionItemIdentity, VisualizationDecisionItem } from '../decisions/decision-types';
import { visualizationSeriesStyle } from './series-style';

export function findItemSeries(definition: VisualizationDefinition, sourceId: string, metric: string,
  identity: DecisionItemIdentity): VisualizationSeries | undefined {
  return definition.series.find(series => series.sourceId === sourceId && series.metric === metric
    && identity.resourceGuid !== undefined && series.resourceGuid === identity.resourceGuid)
    ?? definition.series.find(series => series.sourceId === sourceId && series.metric === metric && !series.resourceGuid);
}

/** Editors retain missing configured identities while sharing runtime override precedence. */
export function resolveItemPresentation(definition: VisualizationDefinition, item: {
  readonly sourceId: string; readonly metric: string; readonly identity: DecisionItemIdentity; readonly providerSeriesId: string;
}) {
  const series = findItemSeries(definition, item.sourceId, item.metric, item.identity);
  const override = series && findVisualizationSeriesOverride(definition, series,
    { id: item.providerSeriesId, resourceGuid: item.identity.resourceGuid });
  const { overrides: _overrides, id: _id, sourceId: _sourceId, resourceGuid: _resourceGuid, metric: _metric,
    ...declaredValues } = series ?? {} as VisualizationSeries;
  const { resourceGuid: _overrideResource, seriesId: _overrideSeries, accountGuid: _account, ...overrideValues } = override ?? {};
  const declared: DecisionItemAppearance = declaredValues, own: DecisionItemAppearance = overrideValues;
  const values = { ...visualizationSeriesStyle(item.providerSeriesId), ...declared, ...own };
  const appearance: VisualizationDecisionItem['appearance'] = { ...values,
    traceType: values.traceType ?? (definition.chart?.kind === 'time-series' ? definition.chart.defaultTraceType : 'line'),
    axis: values.axis ?? 'left', visible: values.visible !== false };
  return { series, override, declared, own, appearance };
}

export function itemKey(identity: DecisionItemIdentity): string { return identity.resourceGuid !== undefined ? `resource:${identity.resourceGuid}` : `series:${identity.seriesId}`; }
export function overrideMatches(override: VisualizationSeriesOverride, identity: DecisionItemIdentity, accountGuid: string): boolean {
  return (override.accountGuid ?? accountGuid) === accountGuid && (identity.resourceGuid !== undefined
    ? override.resourceGuid === identity.resourceGuid : override.seriesId === identity.seriesId);
}
export function isCustomized(appearance: DecisionItemAppearance, explicitOverride = false): boolean {
  return !!appearance.label || !!appearance.color || appearance.traceType !== undefined || (explicitOverride ? appearance.axis !== undefined : appearance.axis === 'right')
    || (explicitOverride ? appearance.visible !== undefined : appearance.visible === false)
    || appearance.lineStyle !== undefined && (explicitOverride || appearance.lineStyle !== 'solid') || appearance.order !== undefined;
}

/** Stable order: configured current members precede new matches; source groups stay together. */
export function orderDecisionItems<T extends VisualizationDecisionItem>(items: T[]): T[] {
  return items.sort((a, b) => (a.appearance.order ?? Number.MAX_SAFE_INTEGER) - (b.appearance.order ?? Number.MAX_SAFE_INTEGER));
}

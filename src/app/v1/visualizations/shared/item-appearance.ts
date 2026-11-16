import type { VisualizationSeriesOverride } from '@domain/visualizations/visualization-definition';
import type { DecisionItemAppearance, DecisionItemIdentity } from '../decisions/decision-types';

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

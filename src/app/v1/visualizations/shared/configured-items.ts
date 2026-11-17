import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { projectAnalysisItems } from '../analysis/analysis-items';
import type { VisualizationDecisionItem } from '../decisions/decision-types';
import { projectEquipmentItems } from '../energy-use/equipment-items';
import { projectPredictorItems } from '../predictor/predictor-items';
import { projectMeterItems } from '../utility/utility-items';
import { visualizationChartLabel } from '../visualization-charts';

/** Configured source metadata remains available without requesting calculation work. */
export function projectDecisionItems(definition: VisualizationDefinition, sourceId: string,
  snapshot: AccountWorkspaceSnapshot): readonly VisualizationDecisionItem[] {
  switch (definition.sources.find(source => source.id === sourceId)?.kind) {
    case 'utility': return projectMeterItems(definition, sourceId, snapshot);
    case 'predictor': return projectPredictorItems(definition, sourceId, snapshot);
    case 'energy-use': return projectEquipmentItems(definition, sourceId, snapshot);
    case 'analysis': return projectAnalysisItems(definition, sourceId, snapshot);
    default: return [];
  }
}

export function configuredChartSummary(definition: VisualizationDefinition,
  snapshot: AccountWorkspaceSnapshot): 'Line' | 'Bar' | 'Combination' | undefined {
  if (definition.chart?.kind !== 'time-series') return undefined;
  const items = definition.sources.flatMap(source => projectDecisionItems(definition, source.id, snapshot));
  const types = new Set(items.length ? items.map(item => item.appearance.traceType) : [definition.chart.defaultTraceType]);
  return types.size > 1 ? 'Combination' : types.has('bar') ? 'Bar' : types.has('line') ? 'Line' : undefined;
}

/** Configured metadata only: no data provider or calculation is requested. */
export function visualizationDefinitionChartLabel(definition: VisualizationDefinition | undefined, snapshot: AccountWorkspaceSnapshot): string {
  return definition ? configuredChartSummary(definition, snapshot) ?? visualizationChartLabel(definition.chart) : 'Chart not selected';
}

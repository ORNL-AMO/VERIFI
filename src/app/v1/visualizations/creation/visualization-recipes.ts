import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { createVisualizationSetupDefinition, type UtilityVisualizationSource, type VisualizationScope } from '@domain/visualizations/visualization-definition';
import { utilityMeterEligible } from '@domain/visualizations/utility/utility-catalog';
import { utilityMeasureKey } from '@domain/visualizations/utility/utility-selection';

export type VisualizationRecipe = 'custom' | 'energy-trend' | 'cost-trend';
export const UTILITY_RECIPES = [
  { id: 'energy-trend' as const, label: 'Energy usage trend', measure: 'energy' as const },
  { id: 'cost-trend' as const, label: 'Utility cost trend', measure: 'cost' as const }
];

export function recipeMeters(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope, recipe: VisualizationRecipe) {
  const measure = recipe === 'cost-trend' ? 'cost' : 'energy';
  return snapshot.meters.filter(m => m.accountId === snapshot.account.guid && (scope.kind === 'portfolio' || m.facilityId === scope.facilityGuid)
    && utilityMeterEligible(m, { measure } as UtilityVisualizationSource)
    && snapshot.meterData.some(r => r.meterId === m.guid && r.accountId === snapshot.account.guid && r.facilityId === m.facilityId));
}

/** Shipped recipes create independent intent only after an explicit resource binding. */
export function createRecipeDefinition(snapshot: AccountWorkspaceSnapshot, recipe: Exclude<VisualizationRecipe, 'custom'>,
  scope: VisualizationScope, meterGuids: readonly string[], name: string) {
  const available = recipeMeters(snapshot, scope, recipe), selected = [...new Set(meterGuids)];
  if (!selected.length || selected.some(guid => !available.some(m => m.guid === guid))) throw new Error('Choose available saved meters for this recipe.');
  const definition = createVisualizationSetupDefinition({ name, accountGuid: snapshot.account.guid, scope,
    chart: { kind: 'time-series', type: 'line', interval: 'monthly', stack: 'none' }, sourceKinds: ['utility'] });
  const source: UtilityVisualizationSource = { id: 'source-1', kind: 'utility', measure: recipe === 'energy-trend' ? 'energy' : 'cost',
    selection: { kind: 'fixed', resource: 'meter', guids: selected }, aggregation: 'sum', groupBy: 'meter', dataMode: 'calendarized',
    settings: recipe === 'energy-trend' ? { unit: { kind: 'owner' }, energyTreatment: { kind: 'owner' } } : {} };
  return { ...definition, sources: [source], series: [{ id: 'series-1', sourceId: source.id, metric: utilityMeasureKey(source), axis: 'left' as const }] };
}

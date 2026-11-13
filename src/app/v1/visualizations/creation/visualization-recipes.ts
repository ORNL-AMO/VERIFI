import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { createVisualizationSetupDefinition, type UtilityVisualizationSource, type VisualizationScope } from '@domain/visualizations/visualization-definition';
import { utilityMeterEligible } from '@domain/visualizations/utility/utility-catalog';
import { utilityMeasureKey } from '@domain/visualizations/utility/utility-selection';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { meterSourceIcon } from '@app/v1/shared/icons/meter-source-icon';

export type VisualizationRecipe = 'custom' | 'energy-trend' | 'cost-trend';
export type RecipeGrouping = 'sources' | 'groups' | 'meters';
export interface RecipeResourceSelection { readonly grouping: RecipeGrouping; readonly ids: readonly string[]; }
export interface RecipeResourceChoice { readonly value: string; readonly label: string; readonly detail: string; readonly icon: IconName; }
export function recipeGroupingChoices(): readonly { readonly value: RecipeGrouping; readonly label: string; readonly icon: IconName }[] {
  return [
    { value: 'sources', label: 'Source', icon: 'energy' },
    { value: 'groups', label: 'Meter group', icon: 'meterGroupItem' },
    { value: 'meters', label: 'Meters', icon: 'meter' }
  ];
}
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

/** Choices use saved history; source filters and group selections retain live membership after creation. */
export function recipeResourceChoices(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope, recipe: VisualizationRecipe,
  grouping: RecipeGrouping): readonly RecipeResourceChoice[] {
  const meters = recipeMeters(snapshot, scope, recipe);
  if (grouping === 'sources') return [...new Set(meters.map(meter => meter.source))].sort().map(source => ({
    value: source, label: source, detail: '', icon: meterSourceIcon(source)
  }));
  const facilityName = (guid: string) => {
    if (scope.kind !== 'portfolio') return '';
    const facility = snapshot.facilities.find(facility => facility.guid === guid);
    return facility ? facility.name || 'Unnamed facility' : 'Unavailable facility';
  };
  if (grouping === 'groups') return snapshot.meterGroups.filter(group => group.accountId === snapshot.account.guid
    && (scope.kind === 'portfolio' || group.facilityId === scope.facilityGuid)
    && meters.some(meter => meter.groupId === group.guid && meter.facilityId === group.facilityId))
    .map(group => ({ value: group.guid, label: group.name || 'Unnamed meter group', detail: facilityName(group.facilityId), icon: 'meterGroupItem' as const }));
  return meters.map(meter => ({ value: meter.guid, label: meter.name || 'Unnamed meter',
    detail: [meter.source, facilityName(meter.facilityId), meter.noLongerInUse ? 'Retired' : ''].filter(Boolean).join(' · '), icon: meterSourceIcon(meter.source) }));
}

/** Shipped recipes create independent intent only after an explicit resource binding. */
export function createRecipeDefinition(snapshot: AccountWorkspaceSnapshot, recipe: Exclude<VisualizationRecipe, 'custom'>,
  scope: VisualizationScope, selection: RecipeResourceSelection, name: string) {
  if (!recipeGroupingChoices().some(choice => choice.value === selection.grouping)
    || recipe === 'cost-trend' && selection.grouping !== 'meters') throw new Error('Choose an available meter view.');
  const available = recipeResourceChoices(snapshot, scope, recipe, selection.grouping), selected = [...new Set(selection.ids)];
  if (!selected.length || selected.some(id => !available.some(choice => choice.value === id))) throw new Error('Choose available resources for this recipe.');
  const definition = createVisualizationSetupDefinition({ name, accountGuid: snapshot.account.guid, scope,
    chart: { kind: 'time-series', type: 'line', interval: 'monthly', stack: 'none' }, sourceKinds: ['utility'] });
  const source: UtilityVisualizationSource = { id: 'source-1', kind: 'utility', measure: recipe === 'energy-trend' ? 'energy' : 'cost',
    selection: selection.grouping === 'sources' ? { kind: 'rule', resource: 'meter', filter: { utilitySources: selected } }
      : { kind: 'fixed', resource: selection.grouping === 'groups' ? 'meter-group' : 'meter', guids: selected },
    aggregation: 'sum', groupBy: selection.grouping === 'sources' ? 'source' : selection.grouping === 'groups' ? 'group' : 'meter', dataMode: 'calendarized',
    settings: recipe === 'energy-trend' ? { unit: { kind: 'owner' }, energyTreatment: { kind: 'owner' } } : {} };
  return { ...definition, sources: [source], series: [{ id: 'series-1', sourceId: source.id, metric: utilityMeasureKey(source), axis: 'left' as const }] };
}

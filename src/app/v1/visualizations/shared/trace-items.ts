import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { projectVisualizationDisplaySettings } from '@domain/visualizations/visualization-display-settings';
import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { projectDecisionItems } from './configured-items';
import { analysisMeasureLabels } from '@domain/visualizations/analysis/facility-analysis-source';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';

export const utilityMeasureLabels: Readonly<Record<string, string>> = { energy: 'Energy', consumption: 'Consumption / water', cost: 'Cost', 'location-emissions': 'Location emissions', 'market-emissions': 'Market emissions', charge: 'Bill charge' };
export const utilityMeasureIcons: Readonly<Record<string, IconName>> = { energy: 'energy', consumption: 'droplet', cost: 'piggyBank', 'location-emissions': 'location', 'market-emissions': 'earth', charge: 'invoice' };
export function projectTraceItems(definition: VisualizationDefinition, snapshot: AccountWorkspaceSnapshot) {
  definition = projectVisualizationDisplaySettings(definition, snapshot);
  const multipleFacilities = resolveVisualizationFacilities(definition, snapshot.facilities).scope.kind === 'portfolio';
  const sourceKinds = [...new Set(definition.sources.map(source => source.kind))];
  const resources = new Map<string, string[]>();
  const entries = definition.sources.flatMap(source => projectDecisionItems(definition, source.id, snapshot).map(item => {
    const keys = resources.get(source.kind) ?? [];
    if (!keys.includes(item.key)) keys.push(item.key);
    resources.set(source.kind, keys);
    const measure = source.kind === 'utility' ? utilityMeasureLabels[source.measure] : source.kind === 'analysis' && source.mode === 'result' ? analysisMeasureLabels[source.measure] : source.kind === 'energy-use' ? 'Consumption' : 'Value';
    const facility = multipleFacilities && item.facilityGuid
      ? snapshot.facilities.find(facility => facility.guid === item.facilityGuid && facility.accountId === definition.accountGuid) : undefined;
    const facilityName = multipleFacilities && item.facilityGuid ? facility ? facility.name || 'Unnamed facility' : 'Unavailable facility' : '';
    return { ...item, traceKey: `${source.id}:${item.key}`, label: `${item.label} · ${measure}`, sourceKind: source.kind,
      detail: [facilityName, item.scopeLabel, item.appearance.traceType, `${item.appearance.axis} axis`, item.appearance.visible ? '' : 'hidden'].filter(Boolean).join(' · ') };
  }));
  return entries.sort((a, b) => (a.appearance.order ?? Number.MAX_SAFE_INTEGER) - (b.appearance.order ?? Number.MAX_SAFE_INTEGER)
    || sourceKinds.indexOf(a.sourceKind) - sourceKinds.indexOf(b.sourceKind)
    || resources.get(a.sourceKind)!.indexOf(a.key) - resources.get(b.sourceKind)!.indexOf(b.key)
    || definition.sources.findIndex(source => source.id === a.sourceId) - definition.sources.findIndex(source => source.id === b.sourceId));
}

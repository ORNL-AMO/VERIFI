import { getNewIdbEntry } from '@data/models/idbModels/idbEntry';
import { HomeDashboardDefinition, HomeOwner, HomeTemplate, HomeViewPreferences } from '@domain/home/home-dashboard';
import { normalizeVisualizationDefinition, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { sameHomeJson } from './home-references';

/** Immutable recipe input. Symbolic chart keys exist only in the proposal, never in saved layouts. */
export interface HomeTemplateBlueprint {
  readonly template: HomeTemplate;
  readonly version: number;
  readonly dashboard: HomeDashboardDefinition;
  readonly charts: readonly { readonly key: string; readonly definition: VisualizationDefinition }[];
  readonly baseline?: HomeDashboardDefinition;
}
export interface HomeGraphProposal {
  readonly createdDate: string;
  readonly charts: readonly { readonly guid: string; readonly definition: VisualizationDefinition }[];
  readonly views?: HomeViewPreferences;
  readonly dashboards: readonly { readonly guid: string; readonly definition: HomeDashboardDefinition;
    readonly template: HomeTemplate; readonly templateVersion: number; readonly baseline?: HomeDashboardDefinition }[];
}

/** Allocate once before submission. Matching charts share only within this operation, never with user charts. */
export function prepareHomeGraph(accountGuid: string, owner: HomeOwner, blueprints: readonly HomeTemplateBlueprint[]): HomeGraphProposal {
  const charts: Array<{ guid: string; definition: VisualizationDefinition }> = [];
  const dashboards = blueprints.map(blueprint => {
    const mapping = new Map<string, string>();
    for (const chart of blueprint.charts) {
      if (mapping.has(chart.key)) throw new Error('A template chart key is ambiguous.');
      if (chart.definition.accountGuid !== accountGuid) throw new Error('Template charts must belong to their owner account.');
      const normalized = normalizeVisualizationDefinition(chart.definition);
      const selection = normalized.facilitySelection;
      if (owner.kind === 'account' ? selection.kind !== 'all' : selection.kind !== 'fixed' || selection.facilityGuids.length !== 1 || selection.facilityGuids[0] !== owner.guid)
        throw new Error('Template charts must use their explicit owner inclusion.');
      let existing = charts.find(candidate => sameHomeJson({ ...candidate.definition, name: '' }, { ...normalized, name: '' }));
      if (!existing) { existing = { guid: getNewIdbEntry().guid, definition: normalized }; charts.push(existing); }
      mapping.set(chart.key, existing.guid);
    }
    const ids = new Map<string, string>();
    const copyWidget = (widget: HomeDashboardDefinition['widgets'][number]) => {
      const id = ids.get(widget.id) ?? getNewIdbEntry().guid; ids.set(widget.id, id);
      const templateKey = widget.templateKey ?? widget.id;
      if (widget.kind !== 'visualization') return { ...structuredClone(widget), id, templateKey };
      const visualizationGuid = mapping.get(widget.visualizationGuid) ?? (blueprint.dashboard.builtIn ? widget.visualizationGuid : undefined);
      if (!visualizationGuid) throw new Error('A template widget has no declared chart.');
      return { ...structuredClone(widget), id, templateKey, visualizationGuid };
    };
    const widgets = blueprint.dashboard.widgets.map(copyWidget);
    return { guid: getNewIdbEntry().guid, definition: { ...structuredClone(blueprint.dashboard), widgets },
      template: blueprint.template, templateVersion: blueprint.version,
      ...(blueprint.baseline ? { baseline: { ...structuredClone(blueprint.baseline), widgets: blueprint.baseline.widgets.map(copyWidget) } } : {}) };
  });
  return { createdDate: new Date().toISOString(), charts, dashboards };
}

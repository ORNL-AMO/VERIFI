import { getNewIdbEntry } from '@data/models/idbModels/idbEntry';
import { HomeDashboardDefinition, HomeOwner, HomeTemplate } from '@domain/home/home-dashboard';
import { normalizeVisualizationDefinition, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { sameHomeJson } from './home-references';

/** Immutable recipe input. Symbolic chart keys exist only in the proposal, never in saved layouts. */
export interface HomeTemplateBlueprint {
  readonly template: HomeTemplate;
  readonly version: number;
  readonly dashboard: HomeDashboardDefinition;
  readonly charts: readonly { readonly key: string; readonly definition: VisualizationDefinition }[];
}
export interface HomeGraphProposal {
  readonly createdDate: string;
  readonly charts: readonly { readonly guid: string; readonly definition: VisualizationDefinition }[];
  readonly dashboards: readonly { readonly guid: string; readonly definition: HomeDashboardDefinition;
    readonly template: HomeTemplate; readonly templateVersion: number }[];
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
    const widgets = blueprint.dashboard.widgets.map(widget => {
      const id = getNewIdbEntry().guid;
      if (widget.kind !== 'visualization') return { ...structuredClone(widget), id };
      const visualizationGuid = mapping.get(widget.visualizationGuid);
      if (!visualizationGuid) throw new Error('A template widget has no declared chart.');
      return { ...structuredClone(widget), id, visualizationGuid };
    });
    return { guid: getNewIdbEntry().guid, definition: { ...structuredClone(blueprint.dashboard), widgets },
      template: blueprint.template, templateVersion: blueprint.version };
  });
  return { createdDate: new Date().toISOString(), charts, dashboards };
}

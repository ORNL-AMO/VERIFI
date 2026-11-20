import type { HomeDashboardDefinition } from '@domain/home/home-dashboard';
import type { HomeReferenceIssue } from '@data/models/idbModels/homeRecord';

export interface HomeReference {
  /** Widget identities survive reordering; paths never use an array ordinal. */
  readonly path: string;
  readonly kind: HomeReferenceIssue['kind'];
  readonly guid: string;
}
export function homeReferences(definition: HomeDashboardDefinition): readonly HomeReference[] {
  return definition.widgets.flatMap(widget => {
    const path = `widgets.${widget.id}`;
    const refs: HomeReference[] = [];
    const add = (field: string, kind: HomeReference['kind'], guid: string) => refs.push({ path: `${path}.${field}`, kind, guid });
    if (widget.kind === 'visualization') add('visualizationGuid', 'visualization', widget.visualizationGuid);
    if (widget.kind === 'goal') {
      if (widget.binding.kind === 'exact') add('binding.analysisGuid', 'analysis', widget.binding.analysisGuid);
      else add('binding.owner.guid', widget.binding.owner.kind, widget.binding.owner.guid);
    }
    if (widget.kind === 'shortcut') {
      add('destination.owner.guid', widget.destination.owner.kind, widget.destination.owner.guid);
      if (widget.destination.resource) add('destination.resource.guid', widget.destination.resource.kind, widget.destination.resource.guid);
    }
    return refs;
  });
}

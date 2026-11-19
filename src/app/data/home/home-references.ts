import { HomeDashboardDefinition, HomeOwner, sameHomeOwner } from '@domain/home/home-dashboard';
import { HomeReferenceIssue, homeRecordOwner } from '@data/models/idbModels/homeRecord';
import { IdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { readHomeDashboard } from './home-record';

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
      else if (widget.binding.owner.kind === 'facility') add('binding.owner.guid', 'facility', widget.binding.owner.guid);
    }
    if (widget.kind === 'shortcut') {
      if (widget.destination.owner.kind === 'facility') add('destination.owner.guid', 'facility', widget.destination.owner.guid);
      if (widget.destination.resource) add('destination.resource.guid', widget.destination.resource.kind, widget.destination.resource.guid);
    }
    return refs;
  });
}
/** Imported widget IDs may contain punctuation or share prefixes; resolve complete typed paths. */
export function duplicateHomeReferenceIssues(definition: HomeDashboardDefinition, issues: readonly HomeReferenceIssue[],
  widgetIds: Readonly<Record<string, string>>): HomeReferenceIssue[] {
  return issues.map(ref => {
    const widget = definition.widgets.find(widget => homeReferences({ ...definition, widgets: [widget] }).some(candidate => candidate.path === ref.path));
    return widget ? { ...ref, path: `widgets.${widgetIds[widget.id]}.${ref.path.slice(`widgets.${widget.id}.`.length)}` } : { ...ref };
  });
}
export function sameHomeJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && sameHomeJson(a[key], b[key]));
}
export function homeDashboardVisible(record: Readonly<IdbHomeDashboard>, catalog: {
  readonly account: { readonly displayEmissions?: boolean };
  readonly meters: readonly { readonly accountId: string; readonly facilityId?: string; readonly source?: string }[];
}): boolean {
  const read = readHomeDashboard(record);
  if (read.state !== 'valid') return false;
  return read.value.visibility === 'always' || read.value.visibility === 'emissions' && !!catalog.account.displayEmissions
    || read.value.visibility === 'water' && catalog.meters.some(meter => meter.accountId === record.accountId
      && (record.facilityId === undefined || meter.facilityId === record.facilityId) && ['Water Intake', 'Water Discharge'].includes(meter.source));
}
export interface HomeWidgetDependency {
  readonly dashboardGuid: string;
  readonly dashboardName: string;
  readonly owner: HomeOwner;
  readonly widgetId: string;
  readonly widgetTitle?: string;
}
/** Includes unavailable linked charts without resolving or deleting their source data. */
export function homeChartDependencies(records: readonly Readonly<IdbHomeDashboard>[], visualizationGuid: string): {
  readonly widgets: readonly HomeWidgetDependency[]; readonly unreadableDashboardGuids: readonly string[];
} {
  const widgets: HomeWidgetDependency[] = [], unreadableDashboardGuids: string[] = [];
  for (const record of records) {
    const decoded = readHomeDashboard(record);
    if (decoded.state !== 'valid') { unreadableDashboardGuids.push(record.guid); continue; }
    for (const widget of decoded.value.widgets) if (widget.kind === 'visualization' && widget.visualizationGuid === visualizationGuid)
      widgets.push({ dashboardGuid: record.guid, dashboardName: decoded.value.name, owner: homeRecordOwner(record), widgetId: widget.id,
        ...(widget.title !== undefined ? { widgetTitle: widget.title } : {}) });
  }
  return { widgets, unreadableDashboardGuids };
}
export function ownedHomeRecords<T extends IdbHomeDashboard>(records: readonly T[], owner: HomeOwner): T[] {
  return records.filter(record => sameHomeOwner(homeRecordOwner(record), owner));
}

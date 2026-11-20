import { homeReferences } from './home-widget-references';
import { HomeDashboardDefinition, HomeOwner, HomeOwnerState, sameHomeOwner } from '@domain/home/home-dashboard';
import { HomeReferenceIssue, homeRecordOwner } from '@data/models/idbModels/homeRecord';
import { IdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { IdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { readHomeDashboard } from './home-record';
import { homeViewKey } from '@domain/home/home-views';

export { homeReferences } from './home-widget-references';
export type { HomeReference } from './home-widget-references';

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
/** Preserve raw unavailable defaults, but never let a coincident destination identity verify them. */
export function homeOwnerResolutionState(record: Readonly<IdbHomeOwner>, state: HomeOwnerState): HomeOwnerState {
  const blocked = record.preservation?.references ?? [];
  const { defaultDashboardGuid, ...rest } = state;
  const views = state.views;
  const available = (ref: import('@domain/home/home-dashboard').HomeDashboardReference, collection: string) =>
    !blocked.some(issue => issue.path === `views.${collection}.${homeViewKey(ref)}`);
  return { ...rest, ...(views ? { views: { ...views,
    order: views.order.filter(ref => available(ref, 'order')),
    hidden: views.hidden.filter(ref => available(ref, 'hidden')),
    deleted: views.deleted.filter(ref => available(ref, 'deleted')),
    ...(blocked.some(issue => issue.path === 'views.default') ? { default: undefined } : {}) } } : {}),
    dashboardOrder: state.dashboardOrder.filter(guid => !blocked.some(ref => ref.path === `dashboardOrder.${guid}`)),
    ...(defaultDashboardGuid && !blocked.some(ref => ref.path === 'defaultDashboardGuid') ? { defaultDashboardGuid } : {}) };
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
export interface HomeChartUsage {
  readonly dashboardGuid: string;
  readonly revision: number;
  readonly widgetIds: readonly string[];
  readonly unreadable?: true;
}
/** A deletion confirmation reviews this exact durable usage, including unreadable uncertainty. */
export function homeChartUsage(records: readonly Readonly<IdbHomeDashboard>[], visualizationGuid: string): HomeChartUsage[] {
  return records.flatMap<HomeChartUsage>(record => {
    const read = readHomeDashboard(record);
    if (read.state !== 'valid') return [{ dashboardGuid: record.guid, revision: record.revision, widgetIds: [], unreadable: true as const }];
    const widgetIds = read.value.widgets.filter(widget => widget.kind === 'visualization' && widget.visualizationGuid === visualizationGuid).map(widget => widget.id).sort();
    return widgetIds.length ? [{ dashboardGuid: record.guid, revision: record.revision, widgetIds }] : [];
  }).sort((a, b) => a.dashboardGuid < b.dashboardGuid ? -1 : a.dashboardGuid > b.dashboardGuid ? 1 : 0);
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

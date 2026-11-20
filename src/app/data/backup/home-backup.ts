import { HOME_FORMAT_VERSION, HomeDashboardDefinition, HomeOwnerState, homeOwnerKey, sameHomeOwner } from '@domain/home/home-dashboard';
import { decodeHomeDashboard, decodeHomeOwnerState } from '@domain/home/home-validation';
import { VisualizationGuidMaps } from '@domain/visualizations/visualization-references';
import { IdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { IdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { IdbHomeRecord, HomeReferenceIssue, homeRecordOwner } from '@data/models/idbModels/homeRecord';
import { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { homeEnvelopeError } from '@data/home/home-record';
import { sameHomeJson } from '@data/home/home-references';
import { homeViewKey } from '@domain/home/home-views';

export type HomeTransferMaps = VisualizationGuidMaps & {
  readonly visualization?: Readonly<Record<string, string>>;
  readonly dashboard?: Readonly<Record<string, string>>;
};
export interface HomeImportSummary {
  readonly dashboards: number;
  readonly owners: number;
  readonly locked: number;
  readonly repairRequired: number;
  readonly reasons: readonly string[];
}

/** Validate stable envelopes/owners before filtering, GUID changes, replacement deletion or writes. */
export function homeBackupRelationshipsError(accountGuid: string, facilities: readonly { guid: string; accountId: string }[],
  dashboards: readonly IdbHomeDashboard[], owners: readonly IdbHomeOwner[], facilityOnly?: string): string | undefined {
  const ownerKeys = new Set<string>();
  for (const [records, payload] of [[dashboards, 'definition'], [owners, 'state']] as const) {
    const guids = new Set<string>();
    for (const record of records) {
      const error = homeEnvelopeError(record, payload);
      if (error) return error;
      if (guids.has(record.guid)) return 'A Home collection contains duplicate record identities.';
      guids.add(record.guid);
      if (record.accountId !== accountGuid || record.facilityId !== undefined && !facilities.some(f => f.guid === record.facilityId && f.accountId === accountGuid))
        return 'A Home record contradicts its account or facility ownership.';
      if (facilityOnly && record.facilityId !== facilityOnly) return 'A facility backup cannot contain another owner’s Home records.';
      if (payload === 'state') {
        const key = homeOwnerKey(accountGuid, homeRecordOwner(record));
        if (ownerKeys.has(key)) return 'A Home owner has more than one configuration record.';
        ownerKeys.add(key);
      }
    }
  }
  return undefined;
}

function mapped(maps: HomeTransferMaps, kind: HomeReferenceIssue['kind'], guid: string): string | undefined {
  const map = maps[kind];
  return map && Object.hasOwn(map, guid) ? map[guid] : undefined;
}

/** Typed fields only. Titles, notes, local IDs and coincident destination identities are never mapping evidence. */
export function remapHomeDefinition(definition: HomeDashboardDefinition, maps: HomeTransferMaps,
  blocked: readonly HomeReferenceIssue[] = []): { definition: HomeDashboardDefinition; references: HomeReferenceIssue[] } {
  const references: HomeReferenceIssue[] = [];
  const move = (path: string, kind: HomeReferenceIssue['kind'], guid: string) => {
    const prior = blocked.find(ref => ref.path === path);
    const target = prior ? undefined : mapped(maps, kind, guid);
    if (!target) references.push(prior ?? { path, kind, guid, reason: 'not-transferred' });
    return target ?? guid;
  };
  const widgets = definition.widgets.map(widget => {
    const path = `widgets.${widget.id}`;
    if (widget.kind === 'visualization') return { ...structuredClone(widget), visualizationGuid: move(`${path}.visualizationGuid`, 'visualization', widget.visualizationGuid) };
    if (widget.kind === 'built-in-chart') return { ...structuredClone(widget), reference: { ...widget.reference, owner: { ...widget.reference.owner,
      guid: move(`${path}.reference.owner.guid`, widget.reference.owner.kind, widget.reference.owner.guid) } } };
    if (widget.kind === 'goal') return { ...structuredClone(widget), binding: widget.binding.kind === 'exact'
      ? { ...widget.binding, analysisGuid: move(`${path}.binding.analysisGuid`, 'analysis', widget.binding.analysisGuid) }
      : { ...widget.binding, owner: { ...widget.binding.owner, guid: move(`${path}.binding.owner.guid`, widget.binding.owner.kind, widget.binding.owner.guid) } } };
    if (widget.kind === 'shortcut') return { ...structuredClone(widget), destination: { ...widget.destination,
      owner: { ...widget.destination.owner, guid: move(`${path}.destination.owner.guid`, widget.destination.owner.kind, widget.destination.owner.guid) },
      ...(widget.destination.resource ? { resource: { ...widget.destination.resource,
        guid: move(`${path}.destination.resource.guid`, widget.destination.resource.kind, widget.destination.resource.guid) } } : {}) } };
    return structuredClone(widget);
  });
  // Retain unclassified historical evidence; a currently known visitor cannot acknowledge it.
  for (const ref of blocked) if (!references.some(item => item.path === ref.path)) references.push(structuredClone(ref));
  return { definition: { ...structuredClone(definition), widgets }, references };
}

function transferEnvelope<T extends IdbHomeRecord>(record: Readonly<T>, accountGuid: string, maps: HomeTransferMaps, guid: string): T {
  const result = structuredClone(record) as T;
  delete result.id;
  result.guid = guid; result.accountId = accountGuid; result.revision = 1;
  if (record.facilityId !== undefined) {
    const facility = mapped(maps, 'facility', record.facilityId);
    if (!facility) throw new Error('A Home owning facility was not transferred.');
    result.facilityId = facility;
  }
  result.preservation = { ...result.preservation, references: structuredClone(record.preservation?.references ?? []),
    transfers: [...(record.preservation?.transfers ?? []), { accountId: record.accountId, targetAccountId: accountGuid, maps: structuredClone(maps) }] };
  return result;
}

export function transferHomeDashboard(record: Readonly<IdbHomeDashboard>, accountGuid: string, maps: HomeTransferMaps,
  guid: string, sourceCharts: readonly IdbSavedVisualization[]): IdbHomeDashboard {
  const result = transferEnvelope(record, accountGuid, maps, guid), read = decodeHomeDashboard(record.definition);
  if (record.preservation?.locked || record.recordVersion !== HOME_FORMAT_VERSION || read.state !== 'valid') {
    result.preservation = { ...result.preservation!, locked: true };
    return result;
  }
  const remapped = remapHomeDefinition(read.value, maps, record.preservation?.references);
  result.definition = remapped.definition;
  result.preservation = { ...result.preservation!, references: remapped.references };
  if (record.template) {
    const baseline = decodeHomeDashboard(record.template.baseline);
    let customized = record.template.customized || baseline.state !== 'valid' || !sameHomeJson(record.template.baseline, read.value);
    const chartBaselines = record.template.chartBaselines.map(chart => {
      const source = sourceCharts.find(candidate => candidate.guid === chart.guid && candidate.accountId === record.accountId);
      const target = mapped(maps, 'visualization', chart.guid);
      if (source && source.revision !== chart.revision) customized = true;
      return { guid: target ?? chart.guid, revision: target && source?.revision === chart.revision ? 1 : chart.revision };
    });
    result.template = { ...structuredClone(record.template), customized, chartBaselines,
      baseline: baseline.state === 'valid' ? remapHomeDefinition(baseline.value, maps).definition : structuredClone(record.template.baseline) };
  }
  return result;
}

export function transferHomeOwner(record: Readonly<IdbHomeOwner>, accountGuid: string, maps: HomeTransferMaps,
  guid: string, sourceDashboards: readonly IdbHomeDashboard[]): IdbHomeOwner {
  const result = transferEnvelope(record, accountGuid, maps, guid), read = decodeHomeOwnerState(record.state);
  if (record.preservation?.locked || record.recordVersion !== HOME_FORMAT_VERSION || read.state !== 'valid') {
    result.preservation = { ...result.preservation!, locked: true };
    return result;
  }
  const references: HomeReferenceIssue[] = [];
  const move = (path: string, sourceGuid: string) => {
    const prior = record.preservation?.references.find(ref => ref.path === path);
    const targetRecord = sourceDashboards.find(dashboard => dashboard.guid === sourceGuid && dashboard.accountId === record.accountId
      && sameHomeOwner(homeRecordOwner(dashboard), homeRecordOwner(record)));
    const target = !prior && targetRecord ? mapped(maps, 'dashboard', sourceGuid) : undefined;
    if (!target) references.push(prior ?? { path, kind: 'dashboard', guid: sourceGuid, reason: 'not-transferred' });
    return target ?? sourceGuid;
  };
  const state: HomeOwnerState = { ...structuredClone(read.value), dashboardOrder: read.value.dashboardOrder.map(id => move(`dashboardOrder.${id}`, id)),
    ...(read.value.defaultDashboardGuid ? { defaultDashboardGuid: move('defaultDashboardGuid', read.value.defaultDashboardGuid) } : {}) };
  if (read.value.views) {
    const views = read.value.views;
    const remap = (ref: import('@domain/home/home-dashboard').HomeDashboardReference, path: string) => ref.kind === 'built-in' ? structuredClone(ref)
      : { ...ref, dashboardGuid: move(path, ref.dashboardGuid) };
    result.state = { ...state, views: { ...structuredClone(views),
      order: views.order.map(ref => remap(ref, `views.order.${homeViewKey(ref)}`)),
      hidden: views.hidden.map(ref => remap(ref, `views.hidden.${homeViewKey(ref)}`)),
      deleted: views.deleted.map(ref => remap(ref, `views.deleted.${homeViewKey(ref)}`)),
      ...(views.default ? { default: remap(views.default, 'views.default') } : {}) } };
  } else result.state = state;
  for (const ref of record.preservation?.references ?? []) if (!references.some(item => item.path === ref.path)) references.push(structuredClone(ref));
  result.preservation = { ...result.preservation!, references };
  return result;
}

export function summarizeHomeImport(dashboards: readonly IdbHomeDashboard[], owners: readonly IdbHomeOwner[]): HomeImportSummary {
  const records = [...dashboards, ...owners];
  const locked = records.filter(record => record.preservation?.locked).length;
  const repairRequired = records.filter(record => !record.preservation?.locked && record.preservation?.references.length).length;
  const reasons: string[] = [];
  if (locked) reasons.push('Some Home layouts or settings use unavailable formats and remain preserved but locked.');
  if (repairRequired) reasons.push('Some Home widgets or defaults retain unavailable relationships and require explicit repair; matching destination identities were not substituted.');
  return { dashboards: dashboards.length, owners: owners.length, locked, repairRequired, reasons };
}

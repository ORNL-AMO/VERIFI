import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import type { UtilityVisualizationSource, VisualizationScope } from '../visualization-definition';
import type { VisualizationResolvedReference } from '../visualization-source-provider';

export interface UtilitySelection {
  readonly meters: readonly IdbUtilityMeter[];
  readonly references: readonly VisualizationResolvedReference[];
  readonly missing: readonly { kind: 'facility' | 'meter' | 'meter-group' | 'charge'; id: string }[];
}

/** Identity and membership only. Discovery never requests calculations or writes records. */
export function resolveUtilitySelection(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope,
  source: UtilityVisualizationSource): UtilitySelection {
  const references: VisualizationResolvedReference[] = [], missing: UtilitySelection['missing'][number][] = [];
  const owned = (item: { accountId: string; facilityId?: string }) => item.accountId === snapshot.account.guid
    && (scope.kind === 'portfolio' || item.facilityId === scope.facilityGuid);
  const add = (kind: VisualizationResolvedReference['kind'], id: string, facilityGuid?: string) => {
    if (!references.some(ref => ref.kind === kind && ref.id === id)) references.push({ kind, id, accountGuid: snapshot.account.guid, ...(facilityGuid ? { facilityGuid } : {}) });
  };
  if (scope.kind === 'facility') {
    if (!snapshot.facilities.some(item => item.guid === scope.facilityGuid && item.accountId === snapshot.account.guid)) missing.push({ kind: 'facility', id: scope.facilityGuid });
    else add('facility', scope.facilityGuid, scope.facilityGuid);
  }
  const selection = source.selection;
  let meters = snapshot.meters.filter(owned);
  if (!selection) return { meters: [], references, missing };
  const requireResources = (kind: 'facility' | 'meter' | 'meter-group', ids: readonly string[]) => {
    for (const id of new Set(ids)) {
      const item = kind === 'facility' ? snapshot.facilities.find(f => f.guid === id && f.accountId === snapshot.account.guid
        && (scope.kind === 'portfolio' || f.guid === scope.facilityGuid))
        : (kind === 'meter' ? snapshot.meters : snapshot.meterGroups).find(item => item.guid === id && owned(item));
      if (!item) missing.push({ kind, id }); else add(kind, id, kind === 'facility' ? id : (item as IdbUtilityMeter).facilityId);
    }
  };
  if (selection.kind === 'fixed') {
    if (!['meter', 'meter-group', 'facility'].includes(selection.resource)) return { meters: [], references, missing };
    requireResources(selection.resource as 'meter' | 'meter-group' | 'facility', selection.guids);
    const ids = new Set(selection.guids);
    meters = meters.filter(m => ids.has(selection.resource === 'meter' ? m.guid : selection.resource === 'meter-group' ? m.groupId : m.facilityId));
  } else {
    const filter = selection.filter;
    requireResources('facility', filter.facilityGuids ?? []);
    requireResources('meter-group', filter.groupGuids ?? []);
    const query = filter.search?.trim().toLocaleLowerCase();
    meters = meters.filter(m => (!filter.facilityGuids?.length || filter.facilityGuids.includes(m.facilityId))
      && (!filter.groupGuids?.length || filter.groupGuids.includes(m.groupId))
      && (!filter.utilitySources?.length || filter.utilitySources.includes(m.source))
      && (filter.includeRetired !== false || !m.noLongerInUse)
      && (!query || [m.name, m.meterNumber, m.source, m.supplier].some(value => String(value ?? '').toLocaleLowerCase().includes(query))));
  }
  if (source.measure === 'charge' && source.charge) {
    const charge = source.charge;
    const meter = meters.find(m => m.guid === charge.meterGuid);
    if (!meter) missing.push({ kind: 'meter', id: charge.meterGuid });
    else if (!meter.charges?.some(item => item.guid === charge.chargeGuid)) missing.push({ kind: 'charge', id: charge.chargeGuid });
    else add('charge', charge.chargeGuid, meter.facilityId);
    meters = meter ? [meter] : [];
  }
  meters = [...new Map(meters.map(m => [m.guid, m])).values()].sort((a, b) => a.guid.localeCompare(b.guid));
  for (const meter of meters) {
    add('meter', meter.guid, meter.facilityId); add('facility', meter.facilityId, meter.facilityId);
    if (meter.groupId && snapshot.meterGroups.some(g => g.guid === meter.groupId && g.facilityId === meter.facilityId && owned(g))) add('meter-group', meter.groupId, meter.facilityId);
  }
  return { meters, references, missing };
}

export function utilityOwner(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope) {
  return scope.kind === 'portfolio' ? snapshot.account : snapshot.facilities.find(f => f.guid === scope.facilityGuid && f.accountId === snapshot.account.guid);
}

export interface UtilityBucket { readonly key: string; readonly label: string; readonly resourceGuid?: string; readonly meters: readonly IdbUtilityMeter[] }
export function utilityBuckets(snapshot: AccountWorkspaceSnapshot, source: UtilityVisualizationSource, meters: readonly IdbUtilityMeter[]): UtilityBucket[] {
  const buckets = new Map<string, { key: string; label: string; resourceGuid?: string; meters: IdbUtilityMeter[] }>();
  for (const meter of meters) {
    const group = snapshot.meterGroups.find(g => g.guid === meter.groupId && g.facilityId === meter.facilityId);
    const facility = snapshot.facilities.find(f => f.guid === meter.facilityId);
    const grouping = source.aggregation === 'none' ? 'meter' : source.groupBy;
    const resourceGuid = grouping === 'meter' ? meter.guid : grouping === 'facility' ? meter.facilityId : grouping === 'group' ? group?.guid : undefined;
    const key = grouping === 'total' ? 'total' : grouping === 'source' ? `source:${meter.source}` : resourceGuid ?? `unassigned:${meter.facilityId}`;
    const label = grouping === 'total' ? 'Total' : grouping === 'source' ? meter.source : grouping === 'meter' ? meter.name
      : grouping === 'facility' ? facility?.name ?? 'Unavailable facility' : `${facility?.name ?? 'Facility'} / ${group?.name ?? 'Unassigned'}`;
    const bucket = buckets.get(key) ?? { key, label, ...(resourceGuid ? { resourceGuid } : {}), meters: [] };
    bucket.meters.push(meter); buckets.set(key, bucket);
  }
  return [...buckets.values()];
}

export function utilitySeriesId(sourceId: string, bucketKey: string): string { return `${sourceId}:${bucketKey}`; }
export function utilityMeasureKey(source: UtilityVisualizationSource): string {
  return source.measure === 'charge' ? `charge:${source.charge?.chargeGuid ?? 'unassigned'}:${source.charge?.measure ?? 'cost'}` : source.measure;
}

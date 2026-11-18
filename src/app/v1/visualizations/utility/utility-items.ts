import { itemKey, isCustomized, resolveItemPresentation } from '../shared/item-appearance';
import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { UtilitySelectionMode, UtilityVisualizationSource, VisualizationDefinition, VisualizationScope } from '@domain/visualizations/visualization-definition';
import { discoverUtilitySeries, utilityMeterEligible } from '@domain/visualizations/utility/utility-catalog';
import { resolveUtilitySelection, utilityBuckets, utilityMeasureKey, utilitySeriesId } from '@domain/visualizations/utility/utility-selection';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { meterSourceIcon } from '@app/v1/shared/icons/meter-source-icon';
import type { DecisionItemIdentity, DecisionResourceChoice, VisualizationDecisionItem } from '../decisions/decision-types';

export function meterSelectionChoices() {
  return [
    { value: 'source', label: 'Source', icon: 'energy' }, { value: 'group', label: 'Meter group', icon: 'meterGroupItem' },
    { value: 'meter', label: 'Individual meters', icon: 'meter' }
  ] as const;
}

/** Resource choices describe ownership and availability, never calculation demand. */
export function meterResourceChoices(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope, mode: UtilitySelectionMode,
  measure: UtilityVisualizationSource['measure'] = 'energy'): readonly DecisionResourceChoice[] {
  const owned = (item: { accountId: string; facilityId?: string }) => item.accountId === snapshot.account.guid
    && !!item.facilityId && scope.facilityGuids.includes(item.facilityId);
  const meters = snapshot.meters.filter(owned);
  const eligible = meters.filter(meter => utilityMeterEligible(meter, { measure } as UtilityVisualizationSource));
  const hasHistory = (ids: readonly string[]) => snapshot.meterData.some(reading => reading.accountId === snapshot.account.guid && ids.includes(reading.meterId));
  const facilityName = (guid: string) => {
    if (scope.kind !== 'portfolio') return '';
    const facility = snapshot.facilities.find(item => item.guid === guid);
    return facility ? facility.name || 'Unnamed facility' : 'Unavailable facility';
  };
  if (mode === 'source') return [...new Set(meters.map(meter => meter.source))].sort().map(source => ({ value: source, label: source,
    detail: hasHistory(eligible.filter(meter => meter.source === source).map(meter => meter.guid)) ? '' : 'No usable readings yet',
    icon: meterSourceIcon(source), available: hasHistory(eligible.filter(meter => meter.source === source).map(meter => meter.guid)) }));
  if (mode === 'group') return snapshot.meterGroups.filter(owned).map(group => {
    const available = hasHistory(eligible.filter(meter => meter.groupId === group.guid).map(meter => meter.guid));
    return { value: group.guid, label: group.name || 'Unnamed meter group', detail: [facilityName(group.facilityId), available ? '' : 'No usable readings yet'].filter(Boolean).join(' · '), icon: 'meterGroupItem' as const, available };
  });
  if (mode === 'facility') return snapshot.facilities.filter(facility => facility.accountId === snapshot.account.guid
    && scope.facilityGuids.includes(facility.guid)).map(facility => {
      const available = hasHistory(eligible.filter(meter => meter.facilityId === facility.guid).map(meter => meter.guid));
      return { value: facility.guid, label: facility.name || 'Unnamed facility', detail: available ? '' : 'No usable readings yet', icon: 'facility' as const, available };
    });
  return meters.map(meter => {
    const available = eligible.includes(meter) && hasHistory([meter.guid]);
    return { value: meter.guid, label: meter.name || 'Unnamed meter', detail: [facilityName(meter.facilityId), meter.source,
      meter.noLongerInUse ? 'Retired' : '', available ? '' : 'No usable readings yet'].filter(Boolean).join(' · '), icon: meterSourceIcon(meter.source), available };
  });
}

export function nativeObservationAvailable(definition: VisualizationDefinition, sourceId: string, snapshot: AccountWorkspaceSnapshot): boolean {
  const source = definition.sources.find(item => item.id === sourceId);
  if (source?.kind === 'utility' && source.measure !== 'charge' && source.aggregation === 'sum' && source.groupBy === 'facility') return false;
  if (source?.kind !== 'utility' || !(source.measure === 'charge' || source.selectionMode === 'meter'
    || source.selectionMode === 'rule' && source.groupBy === 'meter')) return false;
  if (source.selection?.kind === 'fixed' && source.selection.resource === 'meter' && source.selection.guids.length !== 1) return false;
  const selection = resolveUtilitySelection(snapshot, resolveVisualizationFacilities(definition, snapshot.facilities).scope, source);
  return selection.meters.length === 1 && !selection.missing.length;
}

/** Configured identities survive missing readings, empty groups and incompatible observations. */
export function projectMeterItems(definition: VisualizationDefinition, sourceId: string, snapshot: AccountWorkspaceSnapshot): readonly VisualizationDecisionItem[] {
  const source = definition.sources.find(item => item.id === sourceId);
  if (source?.kind !== 'utility' || !source.selection || !source.selectionMode) return [];
  const discovered = discoverUtilitySeries(snapshot, resolveVisualizationFacilities(definition, snapshot.facilities).scope, source);
  const choices = meterResourceChoices(snapshot, resolveVisualizationFacilities(definition, snapshot.facilities).scope, source.selectionMode, source.measure);
  let configured: { identity: DecisionItemIdentity; label: string; detail: string; missing: boolean; available: boolean }[];
  const grouping = source.aggregation === 'none' ? 'meter' : source.groupBy;
  if (source.selectionMode === 'source' && grouping === 'source') {
    const selected = source.selection.kind === 'rule' ? source.selection.filter.utilitySources ?? [] : [];
    configured = selected.map(value => {
      const choice = choices.find(item => item.value === value);
      return { identity: { seriesId: utilitySeriesId(source.id, `source:${value}`) }, label: value, detail: choice?.detail ?? 'No matching meters yet', missing: false, available: choice?.available ?? false };
    });
  } else if (source.selection.kind === 'fixed' && grouping === (source.selection.resource === 'meter-group' ? 'group' : source.selection.resource === 'facility' ? 'facility' : 'meter')) {
    configured = source.selection.guids.map(guid => {
      const choice = choices.find(item => item.value === guid);
      return { identity: { resourceGuid: guid }, label: choice?.label ?? `Unavailable: ${guid}`, detail: choice?.detail ?? 'Saved resource is unavailable', missing: !choice, available: choice?.available ?? false };
    });
  } else {
    const selected = resolveUtilitySelection(snapshot, resolveVisualizationFacilities(definition, snapshot.facilities).scope, source);
    configured = utilityBuckets(snapshot, source, selected.meters).map(bucket => {
      const identity: DecisionItemIdentity = bucket.resourceGuid ? { resourceGuid: bucket.resourceGuid } : { seriesId: utilitySeriesId(source.id, bucket.key) };
      return { identity, label: bucket.label, detail: '', missing: false, available: snapshot.meterData.some(reading => bucket.meters.some(meter => reading.meterId === meter.guid)) };
    });
  }
  const items = configured.map<VisualizationDecisionItem>(item => {
    const guid = item.identity.resourceGuid;
    const facilityGuid = grouping === 'facility' ? guid : grouping === 'meter'
      ? snapshot.meters.find(meter => meter.guid === guid && meter.accountId === definition.accountGuid)?.facilityId
      : grouping === 'group' ? snapshot.meterGroups.find(group => group.guid === guid && group.accountId === definition.accountGuid)?.facilityId : undefined;
    const metadata = discovered.find(entry => item.identity.resourceGuid !== undefined ? entry.resourceGuid === item.identity.resourceGuid : entry.id === item.identity.seriesId);
    const providerIdentity = metadata?.id ?? item.identity.seriesId ?? utilitySeriesId(source.id, item.identity.resourceGuid!);
    const { series: selected, declared, own, appearance } = resolveItemPresentation(definition,
      { sourceId, metric: utilityMeasureKey(source), identity: item.identity, providerSeriesId: providerIdentity });
    return { ...item, ...(facilityGuid ? { facilityGuid } : {}), key: itemKey(item.identity), sourceId, selectedId: selected?.id ?? `${sourceId}-series`, unit: metadata?.unit ?? '',
      customized: isCustomized(own, true) || !!selected?.resourceGuid && isCustomized(declared), customColor: own.color !== undefined || declared.color !== undefined,
      appearance } satisfies VisualizationDecisionItem;
  });
  const discoveryOrder = (item: VisualizationDecisionItem) => {
    const index = discovered.findIndex(series => item.identity.resourceGuid !== undefined ? series.resourceGuid === item.identity.resourceGuid : series.id === item.identity.seriesId);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  return items.sort((a, b) => (a.appearance.order ?? Number.MAX_SAFE_INTEGER) - (b.appearance.order ?? Number.MAX_SAFE_INTEGER)
    || definition.series.findIndex(series => series.id === a.selectedId) - definition.series.findIndex(series => series.id === b.selectedId)
    || discoveryOrder(a) - discoveryOrder(b));
}

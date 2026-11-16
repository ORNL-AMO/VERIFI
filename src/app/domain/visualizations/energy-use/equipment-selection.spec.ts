import type { EquipmentType } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { getNewIdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import type { EnergyUseSelectionMode, EnergyUseVisualizationSource, VisualizationDefinition } from '../visualization-definition';
import { equipmentDefinition, equipmentFixture, equipmentSnapshot } from '../testing/equipment-fixtures';
import { energyUseBuckets, energyUseSeriesId, energyUseSelectionMode } from './equipment-selection';
import { resolveEquipment, equipmentCapabilities, equipmentChartSupport } from './equipment-source';
import { resolveVisualizationFacilities } from '../visualization-facilities';
import { checkVisualizationCompatibility } from '../visualization-capabilities';
import { decodeVisualizationDefinition } from '../visualization-validation';
import { remapVisualizationDefinition } from '../visualization-references';
import { prepareVisualizationFacilityChange } from '../visualization-facility-change';

function snapshot() {
  const a = equipmentFixture({ equipmentType: 'Pump', utilityMeterGroupIds: ['linked-a', 'linked-a', 'linked-b'] });
  const b = equipmentFixture({ guid: 'b', name: 'Second pump', equipmentType: 'Pump', utilityMeterGroupIds: ['linked-a'] });
  b.utilityData[0].energyUse[0].energyUse = 20;
  const base = equipmentSnapshot([a, b]);
  return { ...base, energyUseGroups: [{ ...getNewIdbFacilityEnergyUseGroup('account-a', 'facility-a'), guid: 'group-a', name: 'Pumps' }, { ...getNewIdbFacilityEnergyUseGroup('account-a', 'facility-a'), guid: 'empty', name: 'Empty group' }],
    meterGroups: ['linked-a', 'linked-b'].map(guid => ({ ...getNewIdbUtilityMeterGroup('Energy', guid, 'facility-a', 'account-a'), guid })) };
}
function definition(mode: EnergyUseSelectionMode, ids: string[]): VisualizationDefinition {
  const base = equipmentDefinition();
  const source: EnergyUseVisualizationSource = { id: 'source-1', kind: 'energy-use', measure: 'consumption', denominator: 'selected', selectionMode: mode,
    aggregation: mode === 'equipment' ? 'none' : 'sum', ...(mode === 'equipment-type' ? { equipmentTypes: ids as EquipmentType[] } : { selection: { kind: 'fixed', resource: mode === 'group' ? 'energy-use-group' : mode === 'linked-meter-group' ? 'meter-group' : 'equipment', guids: ids } }) };
  return { ...base, sources: [source] };
}
function resolve(value: ReturnType<typeof snapshot>, def: VisualizationDefinition) {
  const scope = resolveVisualizationFacilities(def, value.facilities).scope;
  const request = { identity: { accountGuid: 'account-a', workspaceRevision: 1, definitionGuid: 'saved', definitionRevision: 1, requestId: 'test', sourceId: 'source-1', scope },
    source: def.sources[0], chart: def.chart!, period: def.period, comparison: def.comparison, series: def.series, dateContext: { calendarDate: '2026-11-16' } };
  const resolution = resolveEquipment(value, request);
  if (resolution.state === 'ready') expect(checkVisualizationCompatibility(def, [{ request, resolution, capabilities: equipmentCapabilities(), chartSupport: equipmentChartSupport(def.sources[0] as EnergyUseVisualizationSource, def.chart!) }]).state).toBe('compatible');
  return resolution;
}

describe('Energy Use selection modes', () => {
  it.each([
    ['group', ['group-a'], [30]], ['equipment', ['equipment-a', 'b'], [10, 20]],
    ['equipment-type', ['Pump'], [30]], ['linked-meter-group', ['linked-a', 'linked-b'], [30, 10]]
  ] as const)('renders independent annual traces by %s, including deduplicated saved links', (mode, ids, amounts) => {
    const value = snapshot(), before = structuredClone(value), def = definition(mode, [...ids]);
    expect(decodeVisualizationDefinition(JSON.parse(JSON.stringify(def))).state).toBe('valid');
    const result = resolve(value, def);
    if (result.state !== 'ready' || result.resolved.data.kind !== 'time-series') throw new Error(JSON.stringify(result));
    expect(result.resolved.series).toHaveLength(amounts.length);
    expect(Object.values(result.resolved.data.rows[0].values).map(point => point.value)).toEqual(amounts);
    expect(value).toEqual(before);
  });
  it.each(['group', 'equipment-type', 'linked-meter-group'] as const)('follows current %s membership without rewriting saved selections or inventing zero for empty selections', mode => {
    const value = snapshot(), ids = mode === 'group' ? ['group-a', 'empty'] : mode === 'equipment-type' ? ['Pump', 'Fan'] : ['linked-a', 'linked-b'];
    const def = definition(mode, ids), before = structuredClone(def);
    const first = resolve(value, def);
    if (first.state !== 'ready' || first.resolved.data.kind !== 'time-series') throw new Error('Expected combined trace');
    if (mode !== 'linked-meter-group') expect(Object.values(first.resolved.data.rows[0].values)[1]).toMatchObject({ state: 'missing', value: null });
    const changed = { ...value, energyUseEquipment: [...value.energyUseEquipment, equipmentFixture({ guid: 'new', equipmentType: 'Pump', utilityMeterGroupIds: ['linked-a'] })] };
    const next = resolve(changed, def);
    if (next.state !== 'ready' || next.resolved.data.kind !== 'time-series') throw new Error('Expected live membership');
    expect(Object.values(next.resolved.data.rows[0].values)[0].value).toBe(40); expect(def).toEqual(before);
    expect(resolve({ ...value, energyUseEquipment: [] }, def).state).toBe('empty');
  });
  it('retains partial coverage and rejects missing or foreign group anchors without broadening selection', () => {
    const original = snapshot(), value = { ...original, energyUseEquipment: original.energyUseEquipment.map((item, index) => ({ ...item, utilityData: index ? [] : item.utilityData })) };
    const result = resolve(value, definition('group', ['group-a']));
    if (result.state !== 'ready' || result.resolved.data.kind !== 'time-series') throw new Error('Expected known partial total');
    expect(Object.values(result.resolved.data.rows[0].values)[0]).toMatchObject({ value: 10, partial: true });
    expect(resolve(value, definition('group', ['deleted']))).toMatchObject({ state: 'missing-source', references: [{ kind: 'energy-use-group', id: 'deleted' }] });
    value.meterGroups[0].accountId = 'foreign'; expect(resolve(value, definition('linked-meter-group', ['linked-a'])).state).toBe('missing-source');
  });
  it('keeps group and linked-group identity namespaces separate through mapping and scope changes', () => {
    const value = snapshot();
    for (const [mode, kind, id] of [['group', 'energy-use-group', 'group-a'], ['linked-meter-group', 'meter-group', 'linked-a']] as const) {
      const base = definition(mode, [id]);
      const def: VisualizationDefinition = { ...base, series: [{ ...base.series[0], overrides: [{ seriesId: energyUseSeriesId(base.sources[0] as EnergyUseVisualizationSource, id), color: '#123456' }] }] };
      const mapped = remapVisualizationDefinition(def, 'destination', { [kind]: { [id]: 'new-guid' } });
      expect((mapped.definition.sources[0] as EnergyUseVisualizationSource).selection).toMatchObject({ resource: kind, guids: ['new-guid'] });
      expect(mapped.definition.series[0].overrides?.[0]).toMatchObject({ seriesId: `source-1:${kind}:new-guid`, accountGuid: 'destination' });
      const target = { ...value, facilities: [...value.facilities, { ...value.facilities[0], guid: 'other-facility' }] };
      const changed = prepareVisualizationFacilityChange(def, { kind: 'fixed', facilityGuids: ['other-facility'] }, target);
      expect((changed.definition.sources[0] as EnergyUseVisualizationSource).selection).toBeUndefined();
    }
  });
  it('treats equipment types as named categories during transfer, with foreign and unknown appearances dormant', () => {
    const base = definition('equipment-type', ['Pump']);
    const def: VisualizationDefinition = { ...base, series: [{ ...base.series[0], overrides: [{ seriesId: 'source-1:equipment-type:Pump', label: 'Pumps' }, { seriesId: 'unknown-type-format', color: '#123456' }, { seriesId: 'source-1:equipment-type:Fan', accountGuid: 'foreign', label: 'Foreign' }] }] };
    const mapped = remapVisualizationDefinition(def, 'destination', {}).definition;
    expect(mapped.sources).toEqual(def.sources);
    expect(mapped.series[0].overrides).toEqual([{ seriesId: 'source-1:equipment-type:Pump', label: 'Pumps', accountGuid: 'destination' }, { seriesId: 'unknown-type-format', color: '#123456', accountGuid: 'account-a' }, { seriesId: 'source-1:equipment-type:Fan', accountGuid: 'foreign', label: 'Foreign' }]);
    expect(energyUseSelectionMode(equipmentDefinition().sources[0] as EnergyUseVisualizationSource)).toBe('equipment');
  });
});

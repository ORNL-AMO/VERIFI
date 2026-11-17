import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { EnergyUseVisualizationSource, VisualizationDefinition } from '../visualization-definition';
import { equipmentDefinition, equipmentFixture, equipmentSnapshot } from '../testing/equipment-fixtures';
import { resolveVisualizationFacilities } from '../visualization-facilities';
import { remapVisualizationDefinition } from '../visualization-references';
import { prepareVisualizationFacilityChange } from '../visualization-facility-change';
import { resolveEquipment } from './equipment-source';
import { energyUseBuckets } from './equipment-selection';
import { buildEnergyUseInventory } from '@app/v1/data/energy-uses/inventory/energy-use-inventory.models';
import { buildEnergyUseGroups } from '@app/v1/data/energy-uses/inventory/energy-use-group.models';
import { buildFacilityEnergyUseResult } from '@app/v1/data/energy-uses/models/facility-energy-use-results.models';
import { getNewIdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';

function definition(ids = ['facility-a', 'facility-b']): VisualizationDefinition {
  const base = equipmentDefinition();
  return { ...base, sources: [{ ...base.sources[0] as EnergyUseVisualizationSource, selectionMode: 'facility', aggregation: 'sum',
    selection: { kind: 'fixed', resource: 'facility', guids: ids } }] };
}
function snapshot(): AccountWorkspaceSnapshot {
  const base = equipmentSnapshot(), older = equipmentFixture({ guid: 'orphan', name: 'Orphan', energyUseGroupId: 'deleted' });
  older.utilityData[0].energyUse = [{ year: 2022, energyUse: 18, energyUseUnit: 'MJ', overrideEnergyUse: true }];
  const newer = equipmentFixture({ guid: 'newer', facilityId: 'facility-b' });
  newer.utilityData[0].energyUse[0] = { year: 2025, energyUse: 20, energyUseUnit: 'kWh', overrideEnergyUse: false };
  const retired = equipmentFixture({ guid: 'retired', noLongerInUse: { isNoLongerInUse: true, year: 2023 } });
  retired.utilityData[0].energyUse[0].year = 2022;
  return { ...base, facilities: [{ ...base.facilities[0], name: 'Facility A' }, { ...base.facilities[0], guid: 'facility-b', name: 'Facility B', energyUnit: 'MMBtu' }, { ...base.facilities[0], guid: 'empty', name: 'Empty' }],
    energyUseEquipment: [...base.energyUseEquipment, older, newer, retired], energyUseGroups: [
      { ...getNewIdbFacilityEnergyUseGroup('account-a', 'facility-a'), guid: 'group-a', name: 'Production' },
      { ...getNewIdbFacilityEnergyUseGroup('account-a', 'facility-a'), guid: 'empty-group', name: 'Empty group' }
    ] };
}
function resolve(value = snapshot(), def = definition()) {
  return resolveEquipment(value, { identity: { accountGuid: value.account.guid, workspaceRevision: 1, definitionGuid: 'saved', definitionRevision: 1, requestId: 'facility', sourceId: 'source-1', scope: resolveVisualizationFacilities(def, value.facilities).scope },
    source: def.sources[0], chart: def.chart!, period: def.period, comparison: def.comparison, series: def.series, dateContext: { calendarDate: '2026-11-16' } });
}
function ready(value = snapshot(), def = definition()) {
  const result = resolve(value, def);
  if (result.state !== 'ready' || result.resolved.data.kind !== 'time-series') throw new Error(JSON.stringify(result));
  return { ...result.resolved, rows: result.resolved.data.rows };
}

describe('annual facility Energy Use visualization', () => {
  it('agrees with existing facility/group results at one common year, including orphans and retirement, without writes', () => {
    const value = snapshot(), before = structuredClone(value), result = ready(value);
    expect(result.rows[0]).toMatchObject({ periodKey: 'FY 2025', start: '2025-01-01', end: '2025-12-31' });
    const inventory = buildEnergyUseInventory(value.account.guid, value.facilities, value.energyUseEquipment, value.energyUseGroups);
    const groups = buildEnergyUseGroups(value.account.guid, value.facilities, value.energyUseGroups, inventory);
    for (const facility of value.facilities.slice(0, 2)) {
      const expected = buildFacilityEnergyUseResult(groups, { ...facility, energyUnit: value.account.energyUnit }, 2025)!;
      expect(result.rows[0].values[`source-1:facility:${facility.guid}`]).toMatchObject({ state: 'observed', value: expected.total, partial: false });
    }
    expect(result.rows[0].values['source-1:facility:facility-a']).toMatchObject({ value: 54, provenance: 'carried-forward', notes: expect.arrayContaining([expect.stringContaining('Orphan:')]) });
    expect(new Set(result.series[0].contributionKeys).size).toBe(result.series[0].contributionKeys?.length);
    expect(result.series[0].contributionKeys?.some(key => result.series[1].contributionKeys?.includes(key))).toBe(false);
    expect(value).toEqual(before);
  });
  it('follows current facility ownership once per equipment GUID, keeping facility picks fixed', () => {
    const value = snapshot(), def = definition(['facility-a']), before = structuredClone(def);
    const changed = { ...value, energyUseEquipment: [...value.energyUseEquipment.filter(item => item.guid !== 'orphan'),
      { ...value.energyUseEquipment[1], facilityId: 'facility-b' }, value.energyUseEquipment[0],
      equipmentFixture({ guid: 'new', energyUseGroupId: 'missing' }), equipmentFixture({ guid: 'foreign', accountId: 'foreign' }), equipmentFixture({ guid: 'excluded', facilityId: 'excluded' })] };
    expect(ready(changed, def).rows[0].values['source-1:facility:facility-a']).toMatchObject({ value: 72 });
    expect(ready(changed, def).series).toHaveLength(1);
    expect(def).toEqual(before);
  });
  it('keeps facility totals stable when equipment changes groups, with empty groups as gaps and nonoverlapping group contributions', () => {
    const value = snapshot(), base = definition(['facility-a']);
    const grouped: VisualizationDefinition = { ...base, period: { kind: 'fiscal-year', year: 2025 }, sources: [{ ...base.sources[0] as EnergyUseVisualizationSource,
      selectionMode: 'group', selection: { kind: 'fixed', resource: 'energy-use-group', guids: ['group-a', 'empty-group'] } }] };
    const first = ready(value, grouped);
    expect(first.rows[0].values['source-1:energy-use-group:group-a']).toMatchObject({ value: 36 });
    expect(first.rows[0].values['source-1:energy-use-group:empty-group']).toMatchObject({ state: 'missing', value: null });
    const transferred = { ...value, energyUseEquipment: value.energyUseEquipment.map(item => item.guid === 'orphan' || item.guid === 'equipment-a' ? { ...item, energyUseGroupId: 'empty-group' } : item) };
    const after = ready(transferred, grouped);
    expect(after.rows[0].values['source-1:energy-use-group:group-a']).toMatchObject({ value: 0 });
    expect(after.rows[0].values['source-1:energy-use-group:empty-group']).toMatchObject({ value: 54 });
    expect(after.series[0].contributionKeys?.some(key => after.series[1].contributionKeys?.includes(key))).toBe(false);
    expect(ready(transferred, base).rows[0].values).toEqual(ready(value, base).rows[0].values);
  });
  it('uses scope-owner units or compatible pinned units, preserving original amounts and partial evidence', () => {
    const value = snapshot(), base = definition(['facility-a']);
    const single = { ...base, facilitySelection: { kind: 'fixed' as const, facilityGuids: ['facility-a'] } };
    expect(ready(value, single).rows[0].values['source-1:facility:facility-a']).toMatchObject({ value: 15 });
    const pinned = { ...definition(), sources: definition().sources.map(source => ({ ...source, settings: { unit: { kind: 'pinned' as const, value: 'MWh' } } })) };
    expect(ready(value, pinned).rows[0].values['source-1:facility:facility-a']).toMatchObject({ value: 0.015, notes: expect.arrayContaining([expect.stringContaining('Saved 18 MJ')]) });
    const partial = { ...value, energyUseEquipment: [...value.energyUseEquipment, equipmentFixture({ guid: 'unknown', utilityData: [] })] };
    expect(ready(partial).rows[0].values['source-1:facility:facility-a']).toMatchObject({ value: 54, partial: true, notes: expect.arrayContaining([expect.stringContaining('No saved utility sources')]) });
    expect(resolve(value, { ...pinned, sources: pinned.sources.map(source => ({ ...source, settings: { unit: { kind: 'pinned' as const, value: 'kg' } } })) }).state).toBe('unsupported');
  });
  it('retains empty and wholly unknown facilities as gaps, and explicit zero as a known value', () => {
    const value = snapshot(), def = definition(['facility-a', 'empty']);
    expect(ready(value, def).rows[0].values['source-1:facility:empty']).toMatchObject({ state: 'missing', value: null });
    expect(resolve(value, definition(['empty'])).state).toBe('empty');
    const zero = equipmentFixture(); zero.utilityData[0].energyUse[0].energyUse = 0;
    const unknown = equipmentFixture({ guid: 'unknown', facilityId: 'facility-b', utilityData: [] });
    const points = ready({ ...value, energyUseEquipment: [zero, unknown] }).rows[0].values;
    expect(points['source-1:facility:facility-a']).toMatchObject({ state: 'observed', value: 0, partial: false });
    expect(points['source-1:facility:facility-b']).toMatchObject({ state: 'missing', value: null });
  });
  it('uses only selected equipment years with intervening history and allows explicitly pinned carry-forward', () => {
    const value = snapshot();
    const unrelated = equipmentFixture({ guid: 'unrelated', facilityId: 'empty' }); unrelated.utilityData[0].energyUse[0].year = 2099;
    const changed = { ...value, energyUseEquipment: [...value.energyUseEquipment, unrelated] };
    const history = ready(changed, { ...definition(), period: { kind: 'all-history' } });
    expect(history.rows.map(row => row.periodKey)).toEqual(['FY 2022', 'FY 2023', 'FY 2024', 'FY 2025']);
    expect(ready(changed, definition(['facility-a'])).rows[0].periodKey).toBe('FY 2024');
    expect(ready(value, { ...definition(), period: { kind: 'fiscal-year', year: 2027 } }).rows[0].values['source-1:facility:facility-a']).toMatchObject({ value: 54, provenance: 'carried-forward' });
    expect(resolve(value, { ...definition(), period: { kind: 'fiscal-year', year: 2021 } }).state).toBe('empty');
    const operating = { ...value, energyUseEquipment: value.energyUseEquipment.map((item, index) => index ? item : { ...item, operatingConditionsData: [{ year: 2026, hoursOfOperation: 1, loadFactor: 1, dutyFactor: 1, efficiency: 1 }] }) };
    expect(ready(operating).rows[0].periodKey).toBe('FY 2026');
  });
  it.each([true, false])('requires matching actual intervals including empty facilities, with end-year labeling %s', endLabel => {
    const value = snapshot(), def = definition(['facility-a', 'facility-b', 'empty']);
    const fiscal = { ...value, facilities: value.facilities.map(f => ({ ...f, fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: endLabel })) };
    expect(ready(fiscal, def).rows[0]).toMatchObject({ start: endLabel ? '2024-07-01' : '2025-07-01', end: endLabel ? '2025-06-30' : '2026-06-30' });
    expect(resolve({ ...fiscal, facilities: fiscal.facilities.map(f => f.guid === 'empty' ? { ...f, fiscalYearCalendarEnd: !endLabel } : f) }, def)).toMatchObject({ state: 'unsupported', message: expect.stringContaining('different actual fiscal intervals') });
    expect(resolve({ ...fiscal, facilities: fiscal.facilities.map(f => ({ ...f, fiscalYearMonth: 99 })) }, def).state).toBe('unsupported');
  });
  it('requires exact owned included facility anchors and rejects mismatched resource namespaces', () => {
    const value = snapshot();
    for (const id of ['missing', 'foreign']) {
      const changed = { ...value, facilities: [...value.facilities, { ...value.facilities[0], guid: 'foreign', accountId: 'another-account' }] };
      expect(resolve(changed, definition([id]))).toMatchObject({ state: 'missing-source', references: [{ kind: 'facility', id }] });
    }
    const def = { ...definition(), facilitySelection: { kind: 'fixed' as const, facilityGuids: ['facility-a'] } };
    expect(resolve(value, def)).toMatchObject({ state: 'missing-source', references: [{ kind: 'facility', id: 'facility-b' }] });
    expect(resolve(value, { ...definition(), sources: [{ ...definition().sources[0] as EnergyUseVisualizationSource, selection: { kind: 'fixed', resource: 'equipment', guids: ['equipment-a'] } }] }).state).toBe('unsupported');
  });
  it('maps facility presentation only with verified identities and reviews excluded scope without retargeting missing anchors', () => {
    const value = snapshot(), base = definition(), def: VisualizationDefinition = { ...base, series: [{ ...base.series[0], overrides: [
      { seriesId: 'source-1:facility:facility-a', color: '#123456' }, { resourceGuid: 'facility-b', label: 'B' },
      { seriesId: 'source-1:facility:facility-a', accountGuid: 'foreign', visible: false }
    ] }] };
    const mapped = remapVisualizationDefinition(def, 'destination', { facility: { 'facility-a': 'new-a', 'facility-b': 'new-b' } }).definition;
    expect(mapped.series[0].overrides).toEqual([{ seriesId: 'source-1:facility:new-a', accountGuid: 'destination', color: '#123456' }, { resourceGuid: 'new-b', label: 'B', accountGuid: 'destination' }, { seriesId: 'source-1:facility:facility-a', accountGuid: 'foreign', visible: false }]);
    const blocked = remapVisualizationDefinition(def, 'destination', { facility: { 'facility-a': 'collision' } }, [{ kind: 'facility', guid: 'facility-a', path: 'sources.0.selection.guids.0', reason: 'not-transferred' }]).definition;
    expect(blocked.series[0].overrides?.[0]).toMatchObject({ seriesId: 'source-1:facility:facility-a', accountGuid: 'account-a' });
    const reviewed = prepareVisualizationFacilityChange(def, { kind: 'fixed', facilityGuids: ['facility-a'] }, value);
    expect((reviewed.definition.sources[0] as EnergyUseVisualizationSource).selection).toMatchObject({ resource: 'facility', guids: ['facility-a'] });
    expect(reviewed.cleared.length).toBeGreaterThan(0);
    expect(reviewed.definition.series[0].overrides).toHaveLength(2);
    expect(energyUseBuckets(value, { kind: 'portfolio', facilityGuids: ['facility-a'] }, definition(['missing']).sources[0] as EnergyUseVisualizationSource).missing).toEqual([{ kind: 'facility', id: 'missing' }]);
  });
});

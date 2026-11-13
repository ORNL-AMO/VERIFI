import { visualizationSnapshot } from '@app/v1/visualizations/testing/visualization-test-fixtures';
import { meter, group } from '@app/v1/data/meters/facility-meters.testing';
import { utilityVisualizationFixture } from '../testing/visualization-fixtures';
import type { UtilityVisualizationSource } from '../visualization-definition';
import { resolveUtilitySelection, utilityBuckets } from './utility-selection';

describe('utility source selection', () => {
  const source = utilityVisualizationFixture().sources[0] as UtilityVisualizationSource;
  it('distinguishes no Source categories from an explicit all-meters Matching Rule', () => {
    const snapshot = { ...visualizationSnapshot(), meters: [meter({ guid: 'a' }), meter({ guid: 'b' })] };
    const selection = { kind: 'rule' as const, resource: 'meter' as const, filter: { utilitySources: [] } };
    expect(resolveUtilitySelection(snapshot, { kind: 'portfolio', facilityGuids: ['facility-a', 'facility-b'] }, { ...source, selectionMode: 'source' as const, selection }).meters).toEqual([]);
    expect(resolveUtilitySelection(snapshot, { kind: 'portfolio', facilityGuids: ['facility-a', 'facility-b'] }, { ...source, selectionMode: 'rule' as const, selection }).meters.map(item => item.guid)).toEqual(['a', 'b']);
  });
  it('keeps fixed group identities while resolving current unique membership', () => {
    const selected = { ...source, selectionMode: 'group' as const, selection: { kind: 'fixed' as const, resource: 'meter-group' as const, guids: ['g'] } };
    const snapshot = { ...visualizationSnapshot(), meters: [meter({ guid: 'a', groupId: 'g' }), meter({ guid: 'b', groupId: 'g', noLongerInUse: true })], meterGroups: [group({ guid: 'g' })] };
    expect(resolveUtilitySelection(snapshot, { kind: 'portfolio', facilityGuids: ['facility-a', 'facility-b'] }, selected).meters.map(m => m.guid)).toEqual(['a', 'b']);
    expect(resolveUtilitySelection({ ...snapshot, meters: [...snapshot.meters, meter({ guid: 'c', groupId: 'g' })] }, { kind: 'portfolio', facilityGuids: ['facility-a', 'facility-b'] }, selected).meters).toHaveLength(3);
    expect(resolveUtilitySelection({ ...snapshot, meterGroups: [] }, { kind: 'portfolio', facilityGuids: ['facility-a', 'facility-b'] }, selected).missing).toContainEqual({ kind: 'meter-group', id: 'g' });
  });
  it('does not broaden a missing rule anchor or include foreign resources', () => {
    const snapshot = { ...visualizationSnapshot(), meters: [meter({ guid: 'owned' }), meter({ guid: 'foreign', accountId: 'other' })] };
    const selected = { ...source, selectionMode: 'rule' as const, selection: { kind: 'rule' as const, resource: 'meter' as const, filter: { groupGuids: ['missing'] } } };
    const result = resolveUtilitySelection(snapshot, { kind: 'portfolio', facilityGuids: ['facility-a', 'facility-b'] }, selected);
    expect(result.meters).toEqual([]); expect(result.missing).toContainEqual({ kind: 'meter-group', id: 'missing' });
  });
  it('matches rules across all rows and includes retired history unless explicitly excluded', () => {
    const snapshot = { ...visualizationSnapshot(), meters: [meter({ guid: 'a', noLongerInUse: true }), meter({ guid: 'b', source: 'Water Intake' })] };
    const selected = { ...source, selectionMode: 'rule' as const, selection: { kind: 'rule' as const, resource: 'meter' as const, filter: { utilitySources: ['Electricity'] } } };
    expect(resolveUtilitySelection(snapshot, { kind: 'portfolio', facilityGuids: ['facility-a', 'facility-b'] }, selected).meters.map(m => m.guid)).toEqual(['a']);
    expect(resolveUtilitySelection(snapshot, { kind: 'portfolio', facilityGuids: ['facility-a', 'facility-b'] }, { ...selected, selection: { ...selected.selection, filter: { ...selected.selection.filter, includeRetired: false } } }).meters).toEqual([]);
  });
  it('keeps unassigned grouping separate across facilities and never groups when aggregation is none', () => {
    const snapshot = visualizationSnapshot(), meters = [meter({ guid: 'a' }), meter({ guid: 'b', facilityId: 'facility-b' })];
    expect(utilityBuckets(snapshot, { ...source, groupBy: 'group' }, meters)).toHaveLength(2);
    expect(utilityBuckets(snapshot, { ...source, groupBy: 'total', aggregation: 'none' }, meters).map(b => b.resourceGuid)).toEqual(['a', 'b']);
  });
  it('enforces the included facility boundary for live rules, groups and Source totals', () => {
    const base = visualizationSnapshot();
    const snapshot = { ...base, facilities: [...base.facilities, { ...base.facilities[0], guid: 'facility-b' }, { ...base.facilities[0], guid: 'facility-c' }],
      meters: [meter({ guid: 'a' }), meter({ guid: 'b', facilityId: 'facility-b' }), meter({ guid: 'c', facilityId: 'facility-c', groupId: 'group-c' })],
      meterGroups: [group({ guid: 'group-c', facilityId: 'facility-c' })] };
    const scope = { kind: 'portfolio' as const, facilityGuids: ['facility-a', 'facility-b'] };
    const rule = { ...source, selectionMode: 'rule' as const, selection: { kind: 'rule' as const, resource: 'meter' as const, filter: {} } };
    expect(resolveUtilitySelection(snapshot, scope, rule).meters.map(meter => meter.guid)).toEqual(['a', 'b']);
    expect(resolveUtilitySelection(snapshot, { ...scope, facilityGuids: [] }, rule).meters).toEqual([]);
    const category = { ...rule, selectionMode: 'source' as const, selection: { ...rule.selection, filter: { utilitySources: ['Electricity'] } } };
    expect(resolveUtilitySelection(snapshot, scope, category).meters.map(meter => meter.guid)).toEqual(['a', 'b']);
    const selectedGroup = { ...source, selectionMode: 'group' as const,
      selection: { kind: 'fixed' as const, resource: 'meter-group' as const, guids: ['group-c'] } };
    expect(resolveUtilitySelection(snapshot, scope, selectedGroup)).toMatchObject({ meters: [], missing: [{ kind: 'meter-group', id: 'group-c' }] });
  });

});

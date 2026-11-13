import { visualizationSnapshot } from '../testing/visualization-test-fixtures';
import { group, meter, reading } from '@app/v1/data/meters/facility-meters.testing';
import { resolveUtilitySelection } from '@domain/visualizations/utility/utility-selection';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { createRecipeDefinition, recipeMeters, recipeResourceChoices } from './visualization-recipes';

describe('utility visualization recipes', () => {
  const snapshot = { ...visualizationSnapshot(), meters: [meter({ meterReadingDataApplication: 'fullMonth' }), meter({ guid: 'water', source: 'Water Intake', startingUnit: 'gal' })],
    meterData: [reading({}), reading({ guid: 'water-bill', meterId: 'water' })] };
  const scope = { kind: 'portfolio' as const, facilityGuids: ['facility-a'] };
  it('requires explicit owned meter binding and never changes the shipped recipe or records', () => {
    expect(() => createRecipeDefinition(snapshot, 'energy-trend', { kind: 'all' }, { grouping: 'meters', ids: [] }, 'Energy')).toThrow();
    expect(() => createRecipeDefinition(snapshot, 'energy-trend', { kind: 'all' }, { grouping: 'meters', ids: ['foreign'] }, 'Energy')).toThrow();
    const before = structuredClone(snapshot), first = createRecipeDefinition(snapshot, 'energy-trend', { kind: 'all' }, { grouping: 'meters', ids: ['meter-a'] }, 'Energy');
    const second = createRecipeDefinition(snapshot, 'energy-trend', { kind: 'all' }, { grouping: 'meters', ids: ['meter-a'] }, 'Another');
    expect(first).not.toBe(second); expect(first.sources[0]).not.toBe(second.sources[0]); expect(snapshot).toEqual(before);
    expect(first.series).toEqual([{ id: 'series-1', sourceId: 'source-1', metric: 'energy', axis: 'left' }]);
  });
  it('offers energy only for energy-capable resources and costs for supported utility types', () => {
    expect(recipeMeters(snapshot, scope, 'energy-trend').map(m => m.guid)).toEqual(['meter-a']);
    const cost = createRecipeDefinition(snapshot, 'cost-trend', { kind: 'all' }, { grouping: 'meters', ids: ['water'] }, 'Water spending');
    expect(cost.sources[0]).toMatchObject({ measure: 'cost', selection: { guids: ['water'] }, settings: {} });
  });

  it.each([
    { grouping: 'sources' as const, id: 'Electricity', groupBy: 'source', selection: { kind: 'rule', resource: 'meter', filter: { utilitySources: ['Electricity'] } } },
    { grouping: 'groups' as const, id: 'group-a', groupBy: 'group', selection: { kind: 'fixed', resource: 'meter-group', guids: ['group-a'] } },
    { grouping: 'meters' as const, id: 'meter-a', groupBy: 'meter', selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a'] } }
  ])('saves $grouping intent and preserves its membership behavior', choice => {
    const grouped = { ...snapshot, meters: snapshot.meters.map(item => ({ ...item, groupId: 'group-a' })),
      meterGroups: [group({ guid: 'group-a', name: 'Production' })] };
    const definition = createRecipeDefinition(grouped, 'energy-trend', { kind: 'all' }, { grouping: choice.grouping, ids: [choice.id] }, 'Energy');
    expect(definition.sources[0]).toMatchObject({ groupBy: choice.groupBy, selection: choice.selection });
    const decoded = decodeVisualizationDefinition(JSON.parse(JSON.stringify(definition)));
    expect(decoded.state).toBe('valid'); expect('definition' in decoded && decoded.definition).toEqual(definition);
    const expanded = { ...grouped, meters: [...grouped.meters, meter({ guid: 'new-meter', groupId: 'group-a' })] };
    const actual = resolveUtilitySelection(expanded, scope, definition.sources[0]).meters.map(item => item.guid);
    expect(actual).toEqual(choice.grouping === 'meters' ? ['meter-a'] : ['meter-a', 'new-meter', ...(choice.grouping === 'groups' ? ['water'] : [])]);
  });

  it('limits resource cards to owned, energy-capable saved history in the selected scope', () => {
    const available = { ...snapshot, meters: [meter({ groupId: 'group-a' }),
      meter({ guid: 'elsewhere', facilityId: 'elsewhere', groupId: 'elsewhere-group', source: 'Natural Gas' }),
      meter({ guid: 'foreign', accountId: 'foreign', groupId: 'foreign-group' }), meter({ guid: 'no-history', groupId: 'empty-group' }), snapshot.meters[1]],
      meterGroups: [group({ guid: 'group-a', name: 'Production' }), group({ guid: 'elsewhere-group', facilityId: 'elsewhere' }),
        group({ guid: 'foreign-group', accountId: 'foreign' }), group({ guid: 'empty-group' })],
      meterData: [...snapshot.meterData, reading({ guid: 'elsewhere-bill', meterId: 'elsewhere', facilityId: 'elsewhere' }),
        reading({ guid: 'foreign-bill', meterId: 'foreign', accountId: 'foreign' })] };
    const facilityScope = { kind: 'facility' as const, facilityGuid: 'facility-a', facilityGuids: ['facility-a'] };
    expect(recipeResourceChoices(available, facilityScope, 'energy-trend', 'sources')).toEqual([
      { value: 'Electricity', label: 'Electricity', detail: '', icon: 'electricity' }
    ]);
    expect(recipeResourceChoices(available, facilityScope, 'energy-trend', 'groups')).toEqual([
      { value: 'group-a', label: 'Production', detail: '', icon: 'meterGroupItem' }
    ]);
    expect(recipeResourceChoices(available, facilityScope, 'energy-trend', 'meters').map(choice => choice.value)).toEqual(['meter-a']);
    expect(() => createRecipeDefinition(available, 'energy-trend', { kind: 'fixed', facilityGuids: ['facility-a'] }, { grouping: 'groups', ids: ['elsewhere-group'] }, 'Energy')).toThrow();
    expect(() => createRecipeDefinition(available, 'energy-trend', { kind: 'fixed', facilityGuids: ['facility-a'] }, { grouping: 'sources', ids: ['Water Intake'] }, 'Energy')).toThrow();
    expect(() => createRecipeDefinition(available, 'cost-trend', { kind: 'all' }, { grouping: 'groups', ids: ['group-a'] }, 'Cost')).toThrow();
  });
});

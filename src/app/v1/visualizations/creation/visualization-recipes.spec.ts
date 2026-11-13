import { visualizationSnapshot } from '../testing/visualization-test-fixtures';
import { meter, reading } from '@app/v1/data/meters/facility-meters.testing';
import { createRecipeDefinition, recipeMeters } from './visualization-recipes';

describe('utility visualization recipes', () => {
  const snapshot = { ...visualizationSnapshot(), meters: [meter({ meterReadingDataApplication: 'fullMonth' }), meter({ guid: 'water', source: 'Water Intake', startingUnit: 'gal' })],
    meterData: [reading({}), reading({ guid: 'water-bill', meterId: 'water' })] };
  const scope = { kind: 'portfolio' as const };
  it('requires explicit owned meter binding and never changes the shipped recipe or records', () => {
    expect(() => createRecipeDefinition(snapshot, 'energy-trend', scope, [], 'Energy')).toThrow();
    expect(() => createRecipeDefinition(snapshot, 'energy-trend', scope, ['foreign'], 'Energy')).toThrow();
    const before = structuredClone(snapshot), first = createRecipeDefinition(snapshot, 'energy-trend', scope, ['meter-a'], 'Energy');
    const second = createRecipeDefinition(snapshot, 'energy-trend', scope, ['meter-a'], 'Another');
    expect(first).not.toBe(second); expect(first.sources[0]).not.toBe(second.sources[0]); expect(snapshot).toEqual(before);
    expect(first.series).toEqual([{ id: 'series-1', sourceId: 'source-1', metric: 'energy', axis: 'left' }]);
  });
  it('offers energy only for energy-capable resources and costs for supported utility types', () => {
    expect(recipeMeters(snapshot, scope, 'energy-trend').map(m => m.guid)).toEqual(['meter-a']);
    const cost = createRecipeDefinition(snapshot, 'cost-trend', scope, ['water'], 'Water spending');
    expect(cost.sources[0]).toMatchObject({ measure: 'cost', selection: { guids: ['water'] }, settings: {} });
  });
});

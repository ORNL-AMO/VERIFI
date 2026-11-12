import { createVisualizationDefinition, createVisualizationSetupDefinition } from '@domain/visualizations/visualization-definition';
import { normalizeVisualizationIntent, reconcileVisualizationIntent, visualizationIntentEqual } from './visualization-reconciliation';

describe('visualization reconciliation', () => {
  it('compares semantic objects independently of insertion order and preserves ordered arrays', () => {
    expect(visualizationIntentEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(visualizationIntentEqual([1, 2], [2, 1])).toBe(false);
  });
  it('normalizes metadata without changing source, scope, or date intent', () => {
    const original = createVisualizationDefinition(' Original ', 'a', { kind: 'facility', facilityGuid: 'f' }, 'energy-use');
    const normalized = normalizeVisualizationIntent({ ...original, appearance: { title: '   ', legend: false } });
    expect(normalized.name).toBe('Original'); expect(normalized.appearance).toEqual({ legend: false });
    expect(normalized.sources).toEqual(original.sources); expect(normalized.period).toEqual(original.period); expect(normalized.scope).toEqual(original.scope);
  });
  it('merges safe fields while retaining the unresolved conflict baseline', () => {
    const base = createVisualizationDefinition('Original', 'a', { kind: 'portfolio' }, 'utility');
    const local = { ...base, name: 'Mine', appearance: { legend: false } };
    const saved = { ...base, name: 'Saved', appearance: { legend: true, title: 'Saved title' } };
    const first = reconcileVisualizationIntent(base, local, saved);
    expect(first.value).toMatchObject({ name: 'Mine', appearance: { legend: false, title: 'Saved title' } });
    expect(first.baseline.name).toBe('Original'); expect(first.conflicts.map(value => value.id)).toEqual(['name']);
    const second = reconcileVisualizationIntent(first.baseline, first.value, saved, { name: 'saved' });
    expect(second.conflicts).toEqual([]); expect(second.value.name).toBe('Saved'); expect(second.value.appearance.legend).toBe(false);
  });
  it('reviews interconnected configuration as one group instead of constructing a hybrid topology', () => {
    const base = createVisualizationDefinition('Original', 'a', { kind: 'portfolio' }, 'utility');
    const local = { ...base, period: { kind: 'rolling' as const, count: 12, unit: 'month' as const, anchor: 'latest-data' as const, basis: 'calendar' as const, includeIncomplete: false } };
    const saved = { ...base, sources: createVisualizationDefinition('Original', 'a', { kind: 'portfolio' }, 'predictor').sources };
    const result = reconcileVisualizationIntent(base, local, saved);
    expect(result.conflicts.map(value => value.id)).toEqual(['configuration']);
    expect(result.value.sources).toEqual(local.sources);
    const selected = reconcileVisualizationIntent(result.baseline, result.value, saved, { configuration: 'saved' });
    expect(selected.value.sources).toEqual(saved.sources); expect(selected.value.period).toEqual(saved.period);
    expect(selected.value).not.toHaveProperty('chart');
  });
  it('reconciles metadata independently while retaining the complete mixed-sourceKind chart setup', () => {
    const base = createVisualizationSetupDefinition({ name: 'Original', accountGuid: 'account-a', scope: { kind: 'portfolio' },
      chart: { kind: 'scatter', showFit: false }, sourceKinds: ['utility', 'predictor'] });
    const local = { ...base, name: 'My name' };
    const saved = { ...base, appearance: { legend: false, title: 'Saved title' } };
    const result = reconcileVisualizationIntent(base, local, saved);
    expect(result.conflicts).toEqual([]);
    expect(result.value).toEqual({ ...base, name: 'My name', appearance: saved.appearance });
    expect(normalizeVisualizationIntent(result.value).chart).toEqual({ kind: 'scatter', showFit: false });
  });
});

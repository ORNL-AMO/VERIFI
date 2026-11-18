import { compositionFixture } from '@domain/visualizations/testing/composition-fixtures';
import { prepareDecisionChange } from './decision-tree';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';

describe('reviewed composition transitions', () => {
  it('retains hierarchy, percentages, pinned year and exact sources when switching treemap to sunburst', () => {
    const { snapshot, definition } = compositionFixture({ kind: 'treemap', hierarchy: ['source', 'equipment'], values: 'percent' });
    const result = prepareDecisionChange(definition, { kind: 'chart', chart: { kind: 'sunburst', hierarchy: [], values: 'absolute' } }, { snapshot });
    expect(result.state).toBe('apply'); if (result.state === 'unchanged') return;
    expect(result.definition.chart).toEqual({ kind: 'sunburst', hierarchy: ['source', 'equipment'], values: 'percent' });
    expect(result.definition.sources).toEqual(definition.sources); expect(result.definition.period).toEqual(definition.period);
  });
  it('reviews incompatible multiyear and comparison resets instead of summing annual snapshots', () => {
    const { snapshot, definition } = compositionFixture();
    const original: VisualizationDefinition = { ...definition, chart: { kind: 'time-series', defaultTraceType: 'line', interval: 'yearly', stack: 'none' }, period: { kind: 'all-history' }, comparison: { kind: 'previous-year', basis: 'fiscal' } };
    const result = prepareDecisionChange(original, { kind: 'chart', chart: { kind: 'breakdown', type: 'donut', values: 'absolute' } }, { snapshot });
    expect(result.state).toBe('confirm'); if (result.state === 'unchanged') return;
    expect(result.definition).toMatchObject({ period: { kind: 'latest-saved-year' }, comparison: { kind: 'none' }, sources: original.sources });
    expect(original.period.kind).toBe('all-history');
  });
  it('reviews a source-category replacement with independent empty bindings and retains a compatible pinned year', () => {
    const { snapshot, definition } = compositionFixture();
    const utility = prepareDecisionChange(definition, { kind: 'add-source', sourceKind: 'utility' }, { snapshot });
    expect(utility.state).toBe('confirm'); if (utility.state === 'unchanged') return;
    expect(utility.definition.sources).toHaveLength(1); expect(utility.definition.sources[0]).toMatchObject({ kind: 'utility' });
    expect(utility.definition.sources[0]).not.toHaveProperty('selection');
    expect(utility.definition.series).toEqual([]);
    expect(utility.definition.chart).toMatchObject({ hierarchy: ['source', 'meter'] });
    const equipment = prepareDecisionChange(utility.definition, { kind: 'add-source', sourceKind: 'energy-use' }, { snapshot });
    if (equipment.state === 'unchanged') throw new Error('Expected replacement review');
    expect(equipment.state).toBe('confirm'); expect(equipment.definition.period).toEqual(definition.period);
  });
});

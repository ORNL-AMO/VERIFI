import { utilityVisualizationFixture } from './testing/visualization-fixtures';
import { serializeVisualizationDefinition } from './visualization-source-groups';
import { decodeVisualizationDefinition } from './visualization-validation';
import type { UtilityVisualizationSource, VisualizationDefinition } from './visualization-definition';
import { analysisDefinition } from './testing/analysis-fixtures';

describe('version 3 normalized source groups', () => {
  function definition(): VisualizationDefinition {
    const original = utilityVisualizationFixture(), source = original.sources[0] as UtilityVisualizationSource;
    return { ...original, sources: [source, { ...source, id: 'utility-cost', measure: 'cost', settings: {} }],
      series: [...original.series, { id: 'cost', sourceId: 'utility-cost', metric: 'cost', resourceGuid: 'meter-a', axis: 'right' }] };
  }
  it('stores one meter selection and selected measures without copying source settings into each projection', () => {
    const serialized = serializeVisualizationDefinition(definition());
    expect(serialized.version).toBe(3); expect(serialized.sources).toHaveLength(1);
    expect(serialized.sources[0]).toMatchObject({ kind: 'utility', measures: ['energy', 'cost'], selection: { selection: { kind: 'fixed', guids: ['meter-a'] } } });
    expect(serialized.sources[0].projections).toEqual([{ id: 'utility', measure: 'energy' }, { id: 'utility-cost', measure: 'cost' }]);
    expect(serialized.displaySettings).toMatchObject({ units: { energy: { kind: 'pinned', value: 'kWh' } }, energyTreatment: { kind: 'pinned', value: 'site' } });
    const read = decodeVisualizationDefinition(serialized);
    expect(read.state).toBe('valid');
    if (!('definition' in read)) throw new Error('Expected current source groups.');
    expect(read.definition.sources.map(source => source.id)).toEqual(['utility', 'utility-cost']);
    expect(read.definition.series).toEqual(definition().series);
    expect(serializeVisualizationDefinition(read.definition)).toEqual(serialized);
  });
  it('rejects conflicting shared selections and malformed or ambiguous projection identities', () => {
    const original = definition();
    expect(() => serializeVisualizationDefinition({ ...original, sources: original.sources.map(source => source.id === 'utility-cost' ? { ...source, selection: { kind: 'fixed', resource: 'meter', guids: ['meter-b'] } } : source) })).toThrow('share one resource');
    const saved = serializeVisualizationDefinition(original);
    expect(decodeVisualizationDefinition({ ...saved, projectionOrder: ['utility', 'utility'] }).state).toBe('invalid');
    expect(decodeVisualizationDefinition({ ...saved, sources: [saved.sources[0], saved.sources[0]] }).state).toBe('invalid');
    expect(decodeVisualizationDefinition({ ...saved, version: 2 }).state).toBe('unsupported');
  });
  it('stores each Analysis target once and requires the complete target by measure selection', () => {
    const base = analysisDefinition(), source = base.sources[0];
    if (source.kind !== 'analysis' || source.mode !== 'result') throw new Error('Expected Analysis results');
    const sources = ['analysis-a', 'analysis-b'].flatMap(analysisGuid => (['actual', 'calculated'] as const).map(measure => ({ ...source, id: `${analysisGuid}-${measure}`, analysisGuid, measure })));
    const grouped = serializeVisualizationDefinition({ ...base, sources, series: [] });
    expect(grouped.sources).toHaveLength(1); expect(grouped.sources[0].targets).toHaveLength(2);
    expect(grouped.sources[0].measures).toEqual(['actual', 'calculated']); expect(grouped.sources[0].projections).toHaveLength(4);
    expect(decodeVisualizationDefinition(grouped).state).toBe('setup-required');
    const group = grouped.sources[0];
    expect(decodeVisualizationDefinition({ ...grouped, sources: [{ ...group, targets: [group.targets![0], group.targets![0]] }] }).state).toBe('invalid');
    expect(decodeVisualizationDefinition({ ...grouped, sources: [{ ...group, projections: group.projections.slice(0, 3) }], projectionOrder: grouped.projectionOrder.slice(0, 3) }).state).toBe('invalid');
  });
});

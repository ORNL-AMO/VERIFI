import { describe, expect, it } from 'vitest';
import { utilityVisualizationFixture, analysisVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { reviewVisualizationReset, reviewVisualizationScopeCopy } from './visualization-recovery';

describe('reviewed visualization recovery', () => {
  it('clears the entire broken fixed selection without silently dropping one contribution', () => {
    const original = utilityVisualizationFixture();
    const result = reviewVisualizationReset(original, [{ path: 'sources.0.selection.guids.0', kind: 'meter', guid: 'meter-a', reason: 'missing' }]);
    expect('selection' in result.definition.sources[0]).toBe(false);
    expect(result.definition.series).toEqual([]);
    expect(decodeVisualizationDefinition(result.definition).state).toBe('setup-required');
    expect(original.series).toHaveLength(1);
    expect(result.definition.appearance).toEqual(original.appearance);
    expect(result.definition.period).toEqual(original.period);
  });
  it('clears model ownership and scatter axes together', () => {
    const original = analysisVisualizationFixture(true);
    const scatter = { ...original, chart: { kind: 'scatter' as const, xSeriesId: 'result', ySeriesId: 'result', showFit: true } };
    const result = reviewVisualizationReset(scatter, [], true);
    expect(result.definition.chart).toBeUndefined();
    expect(result.definition.sources[0]).not.toHaveProperty('analysisGuid');
    expect(result.definition.sources[0]).not.toHaveProperty('modelId');
    expect(decodeVisualizationDefinition(result.definition).state).toBe('setup-required');
  });
  it('retains compatible GUIDs and resets incompatible sources during a reviewed scope copy', () => {
    const original = utilityVisualizationFixture();
    const catalog = { facilities: [{ guid: 'facility-b', accountId: 'account-a' }], meters: [{ guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a' }], meterGroups: [], predictors: [], energyUseGroups: [], energyUseEquipment: [], facilityAnalyses: [], accountAnalyses: [] };
    const result = reviewVisualizationScopeCopy(original, { kind: 'facility', facilityGuid: 'facility-b' }, catalog);
    expect(result.definition.scope).toEqual({ kind: 'facility', facilityGuid: 'facility-b' });
    expect(result.definition.series).toEqual([]);
    expect(result.definition.name).toBe('Monthly energy (Copy)');
    expect(original.scope.kind).toBe('portfolio');
  });
});

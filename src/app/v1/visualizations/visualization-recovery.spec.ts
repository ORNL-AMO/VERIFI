import { describe, expect, it } from 'vitest';
import { utilityVisualizationFixture, analysisVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { createVisualizationSetupDefinition } from '@domain/visualizations/visualization-definition';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { reviewVisualizationReset, reviewVisualizationFacilityCopy } from './visualization-recovery';

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
    expect(result.definition.chart).toEqual({ kind: 'scatter', showFit: true });
    expect(result.definition.sources[0]).not.toHaveProperty('analysisGuid');
    expect(result.definition.sources[0]).not.toHaveProperty('modelId');
    expect(decodeVisualizationDefinition(result.definition).state).toBe('setup-required');
  });
  it('retains an unassigned Scatter choice through reset and scope copy', () => {
    const original = createVisualizationSetupDefinition({ name: 'Setup', accountGuid: 'account-a',
      facilitySelection: { kind: 'all' }, sourceKinds: ['utility', 'predictor'], chart: { kind: 'scatter', showFit: false } });
    const reset = reviewVisualizationReset(original, [], true);
    expect(reset.definition.chart).toEqual(original.chart);
    expect(reset.definition.sources.map(source => source.id)).toEqual(['source-1', 'source-2']);
    expect(reset.definition.series).toEqual([]);
    const catalog = { facilities: [{ guid: 'facility-b', accountId: 'account-a' }], meters: [], meterGroups: [], predictors: [], energyUseGroups: [], energyUseEquipment: [], facilityAnalyses: [], accountAnalyses: [] };
    const copy = reviewVisualizationFacilityCopy(original, { kind: 'fixed', facilityGuids: ['facility-b'] }, catalog);
    expect(copy.definition.chart).toEqual(original.chart);
    expect(decodeVisualizationDefinition(copy.definition).state).toBe('setup-required');
  });
  it('clears only the Scatter axis whose source was reset', () => {
    const original = utilityVisualizationFixture();
    const second = { id: 'source-2', kind: 'predictor' as const, measure: 'value' as const, aggregation: 'none' as const,
      selection: { kind: 'fixed' as const, resource: 'predictor' as const, guids: ['predictor-a'] } };
    const value = { ...original, sources: [...original.sources, second],
      series: [...original.series, { id: 'production', sourceId: 'source-2', metric: 'value', axis: 'right' as const }],
      chart: { kind: 'scatter' as const, xSeriesId: 'energy', ySeriesId: 'production', showFit: false } };
    const review = reviewVisualizationReset(value, [{ path: 'sources.0.selection.guids.0', kind: 'meter', guid: 'meter-a', reason: 'missing' }]);
    expect(review.definition.chart).toEqual({ kind: 'scatter', ySeriesId: 'production', showFit: false });
    expect(review.definition.sources[1]).toEqual(second);
    expect(review.definition.series.map(series => series.id)).toEqual(['production']);
    expect(value.chart.xSeriesId).toBe('energy');
  });
  it('retains compatible GUIDs and resets incompatible sources during a reviewed scope copy', () => {
    const original = utilityVisualizationFixture();
    const catalog = { facilities: [{ guid: 'facility-b', accountId: 'account-a' }], meters: [{ guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a' }], meterGroups: [], predictors: [], energyUseGroups: [], energyUseEquipment: [], facilityAnalyses: [], accountAnalyses: [] };
    const result = reviewVisualizationFacilityCopy(original, { kind: 'fixed', facilityGuids: ['facility-b'] }, catalog);
    expect(result.definition.facilitySelection).toEqual({ kind: 'fixed', facilityGuids: ['facility-b'] });
    expect(result.definition.series).toEqual([]);
    expect(result.definition.name).toBe('Monthly energy (Copy)');
    expect(original.facilitySelection.kind).toBe('all');
  });
});

import { describe, expect, it } from 'vitest';
import { utilityVisualizationFixture, analysisVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { createVisualizationSetupDefinition } from '@domain/visualizations/visualization-definition';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { reviewVisualizationReset, reviewVisualizationFacilityCopy } from './visualization-recovery';
import { equipmentDefinition, equipmentSnapshot } from '@domain/visualizations/testing/equipment-fixtures';
import type { EnergyUseSelectionMode, EnergyUseVisualizationSource, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { energyUseResourceKind } from '@domain/visualizations/energy-use/equipment-selection';
import { analysisDefinition } from '@domain/visualizations/testing/analysis-fixtures';
import { serializeVisualizationDefinition } from '@domain/visualizations/visualization-source-groups';

describe('reviewed visualization recovery', () => {
  it('resets a shared Analysis selection once per measure without leaving duplicate or partially bound targets', () => {
    const base = analysisDefinition(), source = base.sources[0];
    if (source.kind !== 'analysis' || source.mode !== 'result') throw new Error('Expected Analysis results');
    const sources = ['analysis-a', 'analysis-b'].flatMap(analysisGuid => (['actual', 'calculated'] as const).map(measure => ({ ...source, id: `${analysisGuid}-${measure}`, analysisGuid, measure })));
    const original = { ...base, sources, series: [] };
    const review = reviewVisualizationReset(original, [{ path: 'sources.0.analysisGuid', kind: 'analysis', guid: 'analysis-a', reason: 'missing' }]);
    expect(review.definition.sources).toHaveLength(2);
    expect(review.definition.sources.every(item => item.kind === 'analysis' && !item.analysisGuid)).toBe(true);
    expect(decodeVisualizationDefinition(serializeVisualizationDefinition(review.definition)).state).toBe('setup-required');
    expect(review.referencePaths).toContain('sources.3.analysisGuid');
    expect(original.sources).toHaveLength(4);
  });
  it.each<EnergyUseSelectionMode>(['equipment', 'group', 'equipment-type', 'linked-meter-group', 'facility'])('resets %s Energy Use choices and dependent appearance while retaining reusable settings', mode => {
    const base = equipmentDefinition(), source: EnergyUseVisualizationSource = { ...base.sources[0] as EnergyUseVisualizationSource,
      selectionMode: mode, aggregation: mode === 'equipment' ? 'none' : 'sum', settings: { unit: { kind: 'pinned', value: 'MJ' } } };
    const { selection: _selection, ...unbound } = source;
    const original: VisualizationDefinition = { ...base, period: { kind: 'fiscal-year', year: 2028 }, sources: [{ ...unbound,
      ...(mode === 'equipment-type' ? { equipmentTypes: ['Pump'] } : { selection: { kind: 'fixed', resource: energyUseResourceKind(mode), guids: ['selected'] } }) }] };
    const before = structuredClone(original), review = reviewVisualizationReset(original, [], true);
    expect(review.definition.sources[0]).toEqual(unbound);
    expect(review.definition.series).toEqual([]);
    expect(review.definition.chart).toEqual(original.chart); expect(review.definition.period).toEqual(original.period);
    expect(decodeVisualizationDefinition(review.definition).state).toBe('setup-required'); expect(original).toEqual(before);
  });
  it('keeps type membership live on a reviewed facility copy while clearing excluded fixed equipment bindings', () => {
    const snapshot = equipmentSnapshot(), catalog = { ...snapshot, facilities: [...snapshot.facilities, { ...snapshot.facilities[0], guid: 'other' }] };
    const base = equipmentDefinition(), source = base.sources[0] as EnergyUseVisualizationSource;
    const { selection: _selection, ...unbound } = source;
    const typed: VisualizationDefinition = { ...base, sources: [{ ...unbound, selectionMode: 'equipment-type', aggregation: 'sum', equipmentTypes: ['Pump'] }] };
    expect(reviewVisualizationFacilityCopy(typed, { kind: 'fixed', facilityGuids: ['other'] }, catalog).definition.sources).toEqual(typed.sources);
    const fixed = reviewVisualizationFacilityCopy(base, { kind: 'fixed', facilityGuids: ['other'] }, catalog);
    expect(fixed.definition.sources[0]).not.toHaveProperty('selection'); expect(fixed.definition.series).toEqual([]);
    expect(base.sources[0]).toHaveProperty('selection');
  });
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

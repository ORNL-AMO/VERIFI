import { analysisDefinition } from '@domain/visualizations/testing/analysis-fixtures';
import { replaceAnalysisBinding } from './analysis-binding';

describe('analysis binding construction', () => {
  it('retains exact unavailable identity and current chart intent without touching siblings or its input', () => {
    const base = analysisDefinition(), definition = { ...base,
      chart: { ...base.chart!, defaultTraceType: 'bar' as const },
      series: [...base.series, { id: 'source-1-series', sourceId: 'sibling', metric: 'energy', axis: 'left' as const }] };
    const before = structuredClone(definition);
    const result = replaceAnalysisBinding(definition, 'source-1', { analysisGuid: 'deleted-analysis' });
    expect(result.sources[0]).toMatchObject({ analysisGuid: 'deleted-analysis', mode: 'result', measure: 'actual' });
    expect(result.series).toEqual([{ id: 'source-1-series', sourceId: 'sibling', metric: 'energy', axis: 'left' },
      { id: 'source-1-series-1', sourceId: 'source-1', metric: 'actual', resourceGuid: 'deleted-analysis', axis: 'left' }]);
    expect(result.chart).toEqual(definition.chart); expect(definition).toEqual(before);
  });

  it('resets banked measures when rebinding and clears only the bound source series when unbound', () => {
    const result = replaceAnalysisBinding(analysisDefinition('banked-savings', 'group-a'), 'source-1', { analysisGuid: 'replacement' });
    expect(result.sources[0]).toMatchObject({ analysisGuid: 'replacement', measure: 'actual' });
    expect(result.sources[0]).not.toHaveProperty('groupGuid');
    const cleared = replaceAnalysisBinding(result, 'source-1', {});
    expect(cleared.sources[0]).not.toHaveProperty('analysisGuid'); expect(cleared.series).toEqual([]);
  });
});

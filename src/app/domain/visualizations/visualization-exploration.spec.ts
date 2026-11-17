import { prepareExploration, pairRows } from './visualization-exploration';
import { explorationFixture, withExplorationObservation } from './testing/exploration-fixtures';
import { observed } from './testing/visualization-provider-fixtures';
import { decodeVisualizationDefinition } from './visualization-validation';
import { remapVisualizationDefinition, visualizationReferences } from './visualization-references';
import { checkVisualizationCompatibility } from './visualization-capabilities';

const prepare = (fixture = explorationFixture()) => prepareExploration(fixture.definition, [fixture.evidence], new AbortController().signal);
describe('saved exploration observations and statistics', () => {
  it.each([[3, 3], [4, 6]])('renders %i visible series as %i unique ordered pairs', async (series, pairs) => {
    const model = await prepare(explorationFixture(series));
    expect(model.pairs).toHaveLength(pairs);
    expect(new Set(model.pairs.map(pair => pair.id)).size).toBe(pairs);
    expect(model.pairs[0]).toMatchObject({ x: { label: 'A' }, y: { label: 'B' }, count: 4, statistics: { r: 1, rSquared: 1, slope: 2, intercept: 0 } });
    expect(model.pairs[1].statistics.r).toBeCloseTo(-1);
  });
  it('excludes each pair independently while preserving reasons and original partial/zero values', async () => {
    const fixture = explorationFixture();
    const missing = withExplorationObservation(fixture.evidence, 's-c', 0, { state: 'missing', value: null, reason: 'No reading' });
    const partial = withExplorationObservation(missing, 's-c', 1, { ...observed(0), state: 'observed', value: 0, provenance: 'measured', partial: true });
    const model = await prepare({ ...fixture, evidence: partial });
    expect(model.pairs[0].count).toBe(4);
    expect(model.pairs[1]).toMatchObject({ count: 2, excluded: 2 });
    expect(model.pairs[1].statistics.unavailableReason).toContain('three complete');
    expect(pairRows(model, model.pairs[1])[1]).toMatchObject({ included: false, y: { value: 0, partial: true } });
    expect(pairRows(model, model.pairs[1])[0].reason).toContain('No reading');
  });
  it('keeps constant pairs and insufficient standardized series as explained gaps', async () => {
    const model = await prepare(explorationFixture(4));
    expect(model.pairs.find(pair => pair.y.label === 'D')!.statistics.unavailableReason).toContain('must vary');
    expect([...model.series[3].standardized.values()]).toEqual([null, null, null, null]);
  });
  it('uses saved series order/visibility, and computes statistics in raw units when axes change', async () => {
    const fixture = explorationFixture(4);
    const raw = await prepare(fixture);
    const reordered = { ...fixture.definition, chart: { kind: 'correlation' as const, statistic: 'r' as const, scale: 'z-score' as const }, series: [...fixture.definition.series].reverse().map(series => series.resourceGuid === 'b' ? { ...series, visible: false } : series) };
    const model = await prepare({ ...fixture, definition: reordered });
    expect(model.series.map(series => series.label)).toEqual(['D', 'C', 'A']);
    expect(model.pairs).toHaveLength(3);
    const standardized = await prepare({ ...fixture, definition: { ...fixture.definition, chart: reordered.chart } });
    expect(standardized.pairs[0].statistics).toEqual(raw.pairs[0].statistics);
    expect(pairRows(standardized, standardized.pairs[0])[0].displayX).not.toBe(1);
    expect(pairRows(standardized, standardized.pairs[0])[0].x.value).toBe(1);
  });
  it('selects individual expanded scatter series and rejects ambiguous legacy declarations', async () => {
    const fixture = explorationFixture(3, { kind: 'scatter', showFit: true, x: { sourceId: 'utility', resourceGuid: 'b' }, y: { sourceId: 'utility', resourceGuid: 'c' } });
    expect(decodeVisualizationDefinition(fixture.definition).state).toBe('valid');
    expect((await prepare(fixture)).pairs[0]).toMatchObject({ x: { label: 'B' }, y: { label: 'C' } });
    const ambiguous = { ...fixture.definition, series: [{ id: 'all', sourceId: 'utility', metric: 'energy', axis: 'left' as const }], chart: { kind: 'scatter' as const, showFit: true, xSeriesId: 'all', ySeriesId: 'all' } };
    await expect(prepare({ ...fixture, definition: ambiguous })).rejects.toThrow('expanded series');
  });
  it('maps scatter domain references with backup identities and preserves unmapped blocks', () => {
    const { definition } = explorationFixture(3, { kind: 'scatter', showFit: true, x: { sourceId: 'utility', resourceGuid: 'a' }, y: { sourceId: 'utility', resourceGuid: 'b' } });
    expect(visualizationReferences(definition)).toContainEqual({ path: 'chart.x.resourceGuid', kind: 'meter', guid: 'a' });
    const mapped = remapVisualizationDefinition(definition, 'account-b', { facility: { 'facility-a': 'facility-b' }, meter: { a: 'new-a', b: 'new-b', c: 'new-c' } });
    expect(mapped.issues).toEqual([]);
    expect(mapped.definition.chart).toMatchObject({ x: { resourceGuid: 'new-a' }, y: { resourceGuid: 'new-b' } });
    expect(remapVisualizationDefinition(definition, 'account-b', {}).issues.some(issue => issue.path === 'chart.x.resourceGuid')).toBe(true);
  });
  it('rejects native interval mismatches and permits separate-unit month-year heatmaps', () => {
    const fixture = explorationFixture(3, { kind: 'heatmap', dimension: 'month-year', scale: 'linear' });
    expect(checkVisualizationCompatibility(fixture.definition, [fixture.evidence]).state).toBe('compatible');
    const annual = { ...fixture.definition, chart: { kind: 'heatmap' as const, interval: 'yearly' as const, dimension: 'month-year' as const, scale: 'linear' as const } };
    expect(checkVisualizationCompatibility(annual, [{ ...fixture.evidence, request: { ...fixture.evidence.request, chart: annual.chart }, chartSupport: { state: 'supported', chart: annual.chart } }]).state).toBe('unavailable');
  });
  it('honors cancellation without publishing partial pair grids', async () => {
    const fixture = explorationFixture(8), abort = new AbortController();
    const pending = prepareExploration(fixture.definition, [fixture.evidence], abort.signal); abort.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('annual exploration interval compatibility', () => {
  it('accepts calendar/fiscal labels over identical dates and rejects different overlapping intervals', async () => {
    const fixture = explorationFixture(2, { kind: 'correlation', interval: 'yearly', statistic: 'r', scale: 'raw' });
    const source = { ...fixture.definition.sources[0], id: 'other' };
    const definition = { ...fixture.definition, sources: [...fixture.definition.sources, source], series: [...fixture.definition.series, ...fixture.definition.series.map(series => ({ ...series, id: 'other-' + series.id, sourceId: source.id }))] };
    const evidence = (other: boolean, shifted: boolean) => {
      const base = fixture.evidence; if (base.resolution.state !== 'ready' || base.resolution.resolved.data.kind !== 'time-series') throw new Error('Ready observations expected');
      const id = other ? source.id : base.request.source.id;
      const rows = base.resolution.resolved.data.rows.map((row, index) => ({ ...row, periodKey: String(2022 + index), start: `${2022 + index}-${shifted ? '07' : '01'}-01`, end: shifted ? `${2023 + index}-06-30` : `${2022 + index}-12-31`,
        values: Object.fromEntries(Object.entries(row.values).map(([key, value]) => [other ? 'other-' + key : key, value])) }));
      return { ...base, request: { ...base.request, source: other ? source : base.request.source, identity: { ...base.request.identity, sourceId: id }, series: definition.series.filter(series => series.sourceId === id) },
        resolution: { ...base.resolution, identity: { ...base.resolution.identity, sourceId: id }, resolved: { ...base.resolution.resolved,
          series: base.resolution.resolved.series.map(series => ({ ...series, id: other ? 'other-' + series.id : series.id, sourceId: id })),
          periods: rows.map((row, index) => ({ start: row.start, end: row.end, role: 'primary' as const, interval: 'yearly' as const, basis: other ? 'fiscal' as const : 'calendar' as const, ...(other ? { fiscalYear: 2022 + index } : {}) })), data: { kind: 'time-series' as const, rows } } } };
    };
    const matching = [evidence(false, false), evidence(true, false)];
    expect(checkVisualizationCompatibility(definition, matching).state).toBe('compatible');
    const model = await prepareExploration(definition, matching, new AbortController().signal);
    expect(model.pairs[1].count).toBe(4);
    const result = checkVisualizationCompatibility(definition, [evidence(false, false), evidence(true, true)]);
    expect(result.state).toBe('unavailable');
    if (result.state === 'unavailable') expect(result.reasons.some(reason => reason.message.includes('actual start/end'))).toBe(true);
  });
});

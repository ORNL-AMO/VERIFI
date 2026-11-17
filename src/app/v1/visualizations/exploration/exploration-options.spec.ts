import { prepareExploration } from '@domain/visualizations/visualization-exploration';
import { explorationFixture, withExplorationObservation } from '@domain/visualizations/testing/exploration-fixtures';
import { heatmapOption, heatmapPanels, pairOption } from './exploration-options';

describe('exploration chart presentation', () => {
  it('shows raw fit statistics independently of grouping and zoom', async () => {
    const fixture = explorationFixture(3, { kind: 'correlation', statistic: 'r', scale: 'raw', grouping: 'month' });
    const model = await prepareExploration(fixture.definition, [fixture.evidence], new AbortController().signal);
    const option = pairOption(model, model.pairs[0], { start: 20, end: 80 }) as any;
    expect(option.series.filter(series => series.type === 'scatter')).toHaveLength(4);
    expect(option.series.at(-1)).toMatchObject({ type: 'line', data: [[1, 2], [4, 8]] });
    expect(option.dataZoom[0]).toMatchObject({ start: 20, end: 80, filterMode: 'none' });
    expect(model.pairs[0].count).toBe(4);
  });
  it('uses symmetric fixed coefficient scales without confusing negative r and R²', async () => {
    const fixture = explorationFixture();
    const model = await prepareExploration(fixture.definition, [fixture.evidence], new AbortController().signal);
    const panel = heatmapPanels(model)[0];
    expect(panel.cells.find(cell => cell.row === 0 && cell.column === 2)!.value).toBeCloseTo(-1);
    expect(panel.cells.find(cell => cell.row === 2 && cell.column === 0)!.pairId).toBe(panel.cells.find(cell => cell.row === 0 && cell.column === 2)!.pairId);
    expect((heatmapOption(panel) as any).visualMap[0]).toMatchObject({ min: -1, max: 1 });
    const squared = heatmapPanels({ ...model, chart: { kind: 'correlation', statistic: 'r-squared', scale: 'raw' } })[0];
    expect(squared.cells.find(cell => cell.row === 0 && cell.column === 2)!.value).toBeCloseTo(1);
    expect((heatmapOption(squared) as any).visualMap[0]).toMatchObject({ min: 0, max: 1 });
  });
  it('keeps missing/excluded/partial and true zero cells distinct with independent panel units', async () => {
    const fixture = explorationFixture(3, { kind: 'heatmap', dimension: 'month-year', scale: 'linear' });
    let evidence = withExplorationObservation(fixture.evidence, 's-a', 0, { state: 'observed', value: 0, provenance: 'measured', partial: false });
    evidence = withExplorationObservation(evidence, 's-a', 1, { state: 'missing', value: null, reason: 'No bill' });
    evidence = withExplorationObservation(evidence, 's-a', 2, { state: 'excluded', value: null, reason: 'Duplicate month' });
    evidence = withExplorationObservation(evidence, 's-a', 3, { state: 'observed', value: 9, provenance: 'estimated', partial: true });
    const model = await prepareExploration(fixture.definition, [evidence], new AbortController().signal);
    const panels = heatmapPanels(model);
    expect(panels).toHaveLength(3);
    expect(panels[0].cells.slice(0, 5).map(cell => [cell.value, cell.marker])).toEqual([[0, ''], [null, ''], [null, '×'], [9, '*'], [null, '']]);
    expect(panels[0].cells[1].text).toContain('No bill');
    const option = heatmapOption(panels[0]) as any;
    expect(option.series[0]).toMatchObject({ type: 'custom' });
    expect(option.series[0].data).toHaveLength(10);
    expect(option.series[0].data.every(point => point.value.length === 2)).toBe(true);
    expect(option.series[1].data.map(point => point.value[2])).toEqual([0, 9]);
    expect(option.visualMap[0]).toMatchObject({ min: 0, max: 9 });
  });
  it.each([[4, 8], [-8, -4]])('uses observed bounds %s to %s without a synthetic zero for gaps', async (min, max) => {
    const fixture = explorationFixture(1, { kind: 'heatmap', dimension: 'month-year', scale: 'linear' });
    let evidence = withExplorationObservation(fixture.evidence, 's-a', 0, { state: 'observed', value: min, provenance: 'measured', partial: false });
    evidence = withExplorationObservation(evidence, 's-a', 1, { state: 'observed', value: max, provenance: 'measured', partial: false });
    for (const month of [2, 3]) evidence = withExplorationObservation(evidence, 's-a', month, { state: 'missing', value: null, reason: 'No reading' });
    const model = await prepareExploration(fixture.definition, [evidence], new AbortController().signal);
    const option = heatmapOption(heatmapPanels(model)[0]) as any;
    expect(option.visualMap).toHaveLength(1);
    expect(option.visualMap[0]).toMatchObject({ min, max, seriesIndex: 1 });
    expect(option.series[1].data.map(point => point.value[2])).toEqual([min, max]);
    expect(option.series[0].data.every(point => point.cell.value === null && point.cell.marker === '')).toBe(true);
  });

  it('keeps an entirely missing panel blank with no value scale', async () => {
    const fixture = explorationFixture(1, { kind: 'heatmap', dimension: 'month-year', scale: 'linear' });
    let evidence = fixture.evidence;
    for (const month of [0, 1, 2, 3]) evidence = withExplorationObservation(evidence, 's-a', month, { state: 'missing', value: null, reason: 'No reading' });
    const model = await prepareExploration(fixture.definition, [evidence], new AbortController().signal);
    const option = heatmapOption(heatmapPanels(model)[0]) as any;
    expect(option.series[1].data).toEqual([]);
    expect(option.visualMap[0]).toMatchObject({ show: false, min: 0, max: 1 });
  });

  it('normalizes complete observations only while exposing original values and constant gaps', async () => {
    const fixture = explorationFixture(4, { kind: 'heatmap', dimension: 'series-period', scale: 'diverging', normalization: 'z-score' });
    const model = await prepareExploration(fixture.definition, [fixture.evidence], new AbortController().signal);
    const panel = heatmapPanels(model)[0], option = heatmapOption(panel) as any;
    expect(panel.cells[0].text).toContain('1 kWh'); expect(panel.cells[0].text).toContain('z-score');
    expect(panel.cells.filter(cell => cell.row === 3).every(cell => cell.value === null)).toBe(true);
    expect(option.visualMap[0].min).toBe(-option.visualMap[0].max);
  });
});

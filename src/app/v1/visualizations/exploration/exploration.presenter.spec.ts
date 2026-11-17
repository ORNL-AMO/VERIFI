import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { explorationFixture } from '@domain/visualizations/testing/exploration-fixtures';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import type { ExplorationModel } from '@domain/visualizations/visualization-exploration';
import type { VisualizationChart } from '@domain/visualizations/visualization-definition';
import { visualizationSnapshot } from '../testing/visualization-test-fixtures';
import { CorrelationPresenter } from './exploration.presenter';
import { heatmapPanels, pairOption } from './exploration-options';

const charts: VisualizationChart[] = [
  { kind: 'heatmap', dimension: 'month-year', scale: 'linear' },
  { kind: 'correlation', statistic: 'r', scale: 'raw' },
  { kind: 'correlation', view: 'matrix', statistic: 'r', scale: 'raw' },
  { kind: 'scatter', showFit: true, x: { sourceId: 'utility', resourceGuid: 'a' }, y: { sourceId: 'utility', resourceGuid: 'b' } }
];

describe('exploration source labels', () => {
  afterEach(() => TestBed.resetTestingModule());

  async function prepare(multiple: boolean, chart: VisualizationChart, sameLabel = true) {
    const fixture = explorationFixture(2, chart), original = visualizationSnapshot();
    const snapshot = { ...original, facilities: [...original.facilities, { ...original.facilities[0], guid: 'facility-b', name: 'Plant B' }] };
    const definition = { ...fixture.definition,
      facilitySelection: { kind: 'fixed' as const, facilityGuids: multiple ? ['facility-a', 'facility-b'] : ['facility-a'] },
      series: fixture.definition.series.map((series, index) => ({ ...series, label: index && !sameLabel ? 'Temperature' : 'Production' })) };
    const scope = resolveVisualizationFacilities(definition, snapshot.facilities).scope;
    const base = fixture.evidence;
    if (base.resolution.state !== 'ready') throw new Error('Expected ready fixture');
    const evidence = { ...base, request: { ...base.request, identity: { ...base.request.identity, scope } },
      resolution: { ...base.resolution, resolved: { ...base.resolution.resolved,
        series: base.resolution.resolved.series.map(series => ({ ...series, label: 'Production', unit: '' })),
        references: ['a', 'b'].map((id, index) => ({ kind: 'meter' as const, id, accountGuid: definition.accountGuid,
          facilityGuid: multiple && index ? 'facility-b' : 'facility-a' })) } } };
    TestBed.configureTestingModule({ providers: [CorrelationPresenter, { provide: AccountWorkspaceStore, useValue: { snapshot: () => snapshot } }] });
    const before = structuredClone(definition);
    const presentation = await TestBed.inject(CorrelationPresenter).prepare(definition, [evidence], new AbortController().signal);
    expect(definition).toEqual(before);
    return presentation.inputs.model as ExplorationModel;
  }

  it.each(charts)('uses facility names for duplicate labels in $kind charts without exposing internal identities', async chart => {
    const model = await prepare(true, chart);
    expect(model.series.map(series => series.label)).toEqual(['Production · Plant A', 'Production · Plant B']);
    expect(model.series.map(series => series.context)).toEqual(['Meters · Plant A · Production', 'Meters · Plant B · Production']);
    if (chart.kind === 'heatmap') expect(heatmapPanels(model).map(panel => panel.title)).toEqual(model.series.map(series => series.label));
    else expect(model.pairs[0]).toMatchObject({ x: { label: 'Production · Plant A' }, y: { label: 'Production · Plant B' } });
  });

  it('includes facility names even when source labels are already different', async () => {
    const model = await prepare(true, charts[1], false);
    expect(model.series.map(series => series.label)).toEqual(['Production · Plant A', 'Temperature · Plant B']);
  });

  it('omits facility context for a single selected facility and leaves unspecified units blank', async () => {
    const model = await prepare(false, charts[1]);
    expect(model.series.map(series => series.label)).toEqual(['Production', 'Production']);
    const option = pairOption(model, model.pairs[0], { start: 0, end: 100 });
    expect(option.xAxis).toMatchObject({ name: 'Production' });
    expect(option.yAxis).toMatchObject({ name: '' });
    expect(heatmapPanels({ ...model, chart: charts[0] as Extract<NonNullable<ExplorationModel['chart']>, { kind: 'heatmap' }> })[0].unit).toBe('');
  });
});

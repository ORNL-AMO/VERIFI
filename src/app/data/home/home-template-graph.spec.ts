import { prepareHomeGraph } from './home-template-graph';
import { storageBlueprints } from './testing/home-command-fixtures';
import { homeAccountOwner } from '@domain/home/testing/home-fixtures';

describe('Home template proposals', () => {
  it('allocates fresh operation graphs and shares matching chart intent only within one operation', () => {
    const blueprint = storageBlueprints(), before = structuredClone(blueprint);
    const graph = prepareHomeGraph('account-a', homeAccountOwner, blueprint);
    const another = prepareHomeGraph('account-a', homeAccountOwner, blueprint);
    expect(graph.dashboards).toHaveLength(6); expect(graph.charts).toHaveLength(1);
    expect(graph.charts[0].guid).not.toBe(another.charts[0].guid);
    expect(graph.dashboards[0].definition.widgets[0]).toMatchObject({ visualizationGuid: graph.charts[0].guid });
    expect(graph.dashboards[1].definition.widgets[0]).toMatchObject({ visualizationGuid: graph.charts[0].guid });
    expect(graph.dashboards[0].definition.widgets[0].id).not.toBe(graph.dashboards[1].definition.widgets[0].id);
    expect(blueprint).toEqual(before);
  });
  it('keeps different display/source intent independent and refuses unresolved symbolic links or wrong owners', () => {
    const blueprint = storageBlueprints();
    blueprint[1] = { ...blueprint[1], charts: blueprint[1].charts.map(chart => ({ ...chart, definition: { ...chart.definition, appearance: { legend: false } } })) };
    expect(prepareHomeGraph('account-a', homeAccountOwner, blueprint).charts).toHaveLength(2);
    expect(() => prepareHomeGraph('account-a', { kind: 'facility', guid: 'facility-a' }, blueprint)).toThrow('explicit owner inclusion');
    expect(() => prepareHomeGraph('account-a', homeAccountOwner, [{ ...blueprint[0], charts: [] }])).toThrow('no declared chart');
  });
});

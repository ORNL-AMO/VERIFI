import { prepareHomeGraph } from './home-template-graph';
import { storageBlueprints } from './testing/home-command-fixtures';
import { homeAccountOwner } from '@domain/home/testing/home-fixtures';

describe('Home template proposals', () => {
  it('copies built-in configuration identities and independent widget instances without allocating chart records', () => {
    const widget = { id: 'HOME.energy-trend', kind: 'built-in-chart' as const, size: 'half' as const, visibility: 'always' as const,
      reference: { kind: 'built-in' as const, recipe: 'reporting-energy-rolling', version: 1, owner: homeAccountOwner }, inherit: [], overrides: {} };
    const graph = prepareHomeGraph('account-a', homeAccountOwner, [{ ...storageBlueprints()[0],
      dashboard: { ...storageBlueprints()[0].dashboard, widgets: [widget,
        { id: 'HOME.note', kind: 'note', visibility: 'always', size: 'full', text: 'Note' }] }, charts: [] }]);
    expect(graph.charts).toEqual([]);
    expect(graph.dashboards[0].definition.widgets[0]).toMatchObject({ templateKey: widget.id, reference: widget.reference });
    expect(graph.dashboards[0].definition.widgets[0].id).not.toBe(widget.id);
    expect(graph.dashboards[0].definition.widgets[1]).toMatchObject({ templateKey: 'HOME.note' });
  });
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

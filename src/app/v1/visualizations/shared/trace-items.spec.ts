import type { VisualizationDefinition, UtilityVisualizationSource } from '@domain/visualizations/visualization-definition';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { facility, group, meter } from '@app/v1/data/meters/facility-meters.testing';
import { visualizationSnapshot } from '../testing/visualization-test-fixtures';
import { projectTraceItems } from './trace-items';
import { analysisDefinition, analysisFixture } from '@domain/visualizations/testing/analysis-fixtures';
import { prepareDecisionChange } from '../decisions/decision-tree';

describe('trace section subdetails', () => {
  it('identifies total and group targets from the same Analysis in trace subdetails', () => {
    const data = analysisFixture();
    const result = prepareDecisionChange(analysisDefinition(), { kind: 'analysis-targets', targets: [{ analysisGuid: 'analysis-a' }, { analysisGuid: 'analysis-a', groupGuid: 'group-a' }] }, { snapshot: data.snapshot });
    if (result.state === 'unchanged') throw new Error('Expected target scopes');
    const items = projectTraceItems(result.definition, data.snapshot);
    expect(items.map(item => item.label)).toEqual(['Production baseline · Actual use', 'Production baseline · Actual use']);
    expect(items.map(item => item.detail)).toEqual(['Facility total · line · left axis', 'Production · line · left axis']);
  });
  const snapshot = () => ({ ...visualizationSnapshot(), facilities: [facility({ name: 'Plant A' }), facility({ guid: 'facility-b', name: 'Plant B' })],
    meters: [meter({ name: 'Electricity' }), meter({ guid: 'meter-b', facilityId: 'facility-b', name: 'Electricity' })],
    meterGroups: [group({ guid: 'group-a', name: 'Electricity' }), group({ guid: 'group-b', facilityId: 'facility-b', name: 'Electricity' })] });
  function definition(groups = false): VisualizationDefinition {
    const base = utilityVisualizationFixture(), original = base.sources[0] as UtilityVisualizationSource;
    const source: UtilityVisualizationSource = { ...original, selectionMode: groups ? 'group' : 'meter', groupBy: groups ? 'group' : 'meter',
      selection: { kind: 'fixed', resource: groups ? 'meter-group' : 'meter', guids: groups ? ['group-a', 'group-b'] : ['meter-a', 'meter-b'] } };
    return { ...base, sources: [source, { ...source, id: 'cost', measure: 'cost', settings: {} }],
      series: [{ id: 'energy', sourceId: source.id, metric: 'energy', axis: 'left' }, { id: 'cost', sourceId: 'cost', metric: 'cost', axis: 'right', traceType: 'bar', visible: false }] };
  }
  it.each([false, true])('identifies same-named meter traces and keeps appearance details (groups: %s)', groups => {
    const items = projectTraceItems(definition(groups), snapshot());
    expect(items.map(item => item.label)).toEqual(['Electricity · Energy', 'Electricity · Cost', 'Electricity · Energy', 'Electricity · Cost']);
    expect(items.map(item => item.detail)).toEqual(['Plant A · line · left axis', 'Plant A · bar · right axis · hidden', 'Plant B · line · left axis', 'Plant B · bar · right axis · hidden']);
  });
  it('omits facility names for fixed single-facility and live All with one facility', () => {
    const base = definition(), data = snapshot();
    for (const { facilitySelection, facilities } of [{ facilitySelection: { kind: 'fixed' as const, facilityGuids: ['facility-a'] }, facilities: data.facilities }, { facilitySelection: { kind: 'all' as const }, facilities: data.facilities.slice(0, 1) }]) {
      const items = projectTraceItems({ ...base, facilitySelection }, { ...data, facilities });
      expect(items[0].detail).toBe('line · left axis');
    }
  });
  it('follows current facility names and labels unnamed facilities', () => {
    const data = snapshot();
    const items = projectTraceItems(definition(), { ...data, facilities: data.facilities.map((item, index) => ({ ...item, name: index ? '' : 'Renamed plant' })) });
    expect(items[0].detail).toBe('Renamed plant · line · left axis');
    expect(items[2].detail).toBe('Unnamed facility · line · left axis');
  });
});

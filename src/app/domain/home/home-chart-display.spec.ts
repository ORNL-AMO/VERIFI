import type { HomeWidget } from './home-dashboard';
import type { UtilityVisualizationSource } from '../visualizations/visualization-definition';
import { homeChartDisplay, applyHomeChartDisplay } from './home-chart-display';
import { chartWidget } from './testing/home-fixtures';
import { utilityVisualizationFixture } from '../visualizations/testing/visualization-fixtures';
import { utilityCapabilities } from '../visualizations/utility/utility-capabilities';

describe('Home display precedence and capability boundary', () => {
  const period = { kind: 'fixed' as const, start: '2024-01-01', end: '2024-12-31', basis: 'calendar' as const };
  it('resolves each override independently, preserving the linked source and inclusion', () => {
    const widget = { ...chartWidget('chart', 'widget') as Extract<HomeWidget, { kind: 'visualization' }>, inherit: ['period', 'units', 'energyTreatment'] as const,
      overrides: { displaySettings: { energyTreatment: { kind: 'pinned' as const, value: 'source' as const } } } };
    const display = homeChartDisplay(widget, { period, displaySettings: { units: { energy: { kind: 'owner' } }, energyTreatment: { kind: 'pinned', value: 'site' } } });
    expect(display).toEqual({ period, displaySettings: { units: { energy: { kind: 'owner' } }, energyTreatment: { kind: 'pinned', value: 'source' } } });
    const definition = utilityVisualizationFixture(), applied = applyHomeChartDisplay(definition, display, definition.sources.map(source => utilityCapabilities(source as any)));
    expect(applied.state).toBe('ready'); if (applied.state !== 'ready') return;
    expect(applied.definition.sources).toEqual(definition.sources); expect(applied.definition.facilitySelection).toEqual(definition.facilitySelection); expect(definition.period).not.toEqual(period);
    expect(homeChartDisplay({ ...widget, inherit: [], overrides: {} }, { period })).toEqual({});
  });
  it('rejects unapproved dates and fixed analysis basis rather than discarding requested overrides', () => {
    const definition = utilityVisualizationFixture(), capabilities = definition.sources.map(source => utilityCapabilities(source as any));
    expect(applyHomeChartDisplay(definition, { period }, capabilities.map(capability => ({ ...capability, allowDateOverride: false }))).state).toBe('unavailable');
    const analysis = { ...definition, sources: [{ id: 'a', kind: 'analysis' as const, mode: 'result' as const, measure: 'rolling-improvement' as const, aggregation: 'none' as const, analysisGuid: 'a' }] };
    expect(applyHomeChartDisplay(analysis, { displaySettings: { energyTreatment: { kind: 'pinned', value: 'site' } } }, capabilities).state).toBe('unavailable');
  });
  it('switches utility emissions only in the request, retaining selection and matched series metric', () => {
    const base = utilityVisualizationFixture(); const source = { ...base.sources[0] as UtilityVisualizationSource, kind: 'utility' as const, measure: 'market-emissions' as const, aggregation: 'sum' as const, dataMode: 'calendarized' as const, groupBy: 'total' as const };
    const definition = { ...base, sources: [source], series: [{ id: 's', sourceId: source.id, metric: 'market-emissions', axis: 'left' as const }] };
    const result = applyHomeChartDisplay(definition, { emissionsTreatment: 'location' }, [utilityCapabilities(source)]);
    expect(result.state).toBe('ready'); if (result.state !== 'ready') return;
    expect(result.definition.sources[0].measure).toBe('location-emissions'); expect(definition.sources[0].measure).toBe('market-emissions');
  });
});

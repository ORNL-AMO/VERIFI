import { utilityVisualizationFixture } from '../testing/visualization-fixtures';
import type { UtilityVisualizationSource } from '../visualization-definition';
import { utilityCapabilities, utilityChartSupport } from './utility-capabilities';

describe('utility capability boundaries', () => {
  const source = utilityVisualizationFixture().sources[0] as UtilityVisualizationSource;
  const chart = { kind: 'time-series' as const, type: 'line' as const, interval: 'monthly' as const, stack: 'none' as const };
  it('advertises only implemented shapes and exact chart settings', () => {
    expect(utilityCapabilities(source).shapes).toEqual(['time-series']);
    expect(utilityChartSupport(source, chart).state).toBe('supported');
    expect(utilityChartSupport(source, { ...chart, stack: 'absolute' }).state).toBe('unsupported');
    expect(utilityChartSupport(source, { ...chart, type: 'area' }).state).toBe('unsupported');
  });
  it('requires native individual charge observations and disallows calendarized charges', () => {
    const charge = { ...source, measure: 'charge' as const };
    expect(utilityChartSupport(charge, chart).state).toBe('unsupported');
    const native = { ...charge, dataMode: 'billing-period' as const, aggregation: 'none' as const, groupBy: 'meter' as const };
    expect(utilityChartSupport(native, { ...chart, interval: 'native' }).state).toBe('supported');
    expect(utilityCapabilities(native).comparisons).toEqual(['none']);
    expect(utilityChartSupport({ ...native, aggregation: 'sum' }, { ...chart, interval: 'native' }).state).toBe('unsupported');
  });
  it('does not silently reinterpret a group-name matching rule as a meter-name rule', () => {
    expect(utilityChartSupport({ ...source, selection: { kind: 'rule', resource: 'meter-group', filter: { search: 'Boilers' } } }, chart).state).toBe('unsupported');
  });
});

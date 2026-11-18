import type { VisualizationDefinition, UtilityVisualizationSource } from '../visualization-definition';
import type { VisualizationSourceEvidence, VisualizationSourceRequest } from '../visualization-source-provider';
import { utilityVisualizationFixture } from '../testing/visualization-fixtures';
import { visualizationSnapshot } from '@app/v1/visualizations/testing/visualization-test-fixtures';
import { calendarizedMeter, meter, monthlyData, reading } from '@app/v1/data/meters/facility-meters.testing';
import { resolveCalendarizedUtility } from './utility-calendarized';
import { utilityCapabilities, utilityChartSupport } from './utility-capabilities';
import { checkVisualizationCompatibility } from '../visualization-capabilities';
import { resolveVisualizationFacilities } from '../visualization-facilities';

describe('utility composition projection', () => {
  function setup(type: 'bar' | 'donut' = 'donut', amounts = [10, 0]) {
    const base = utilityVisualizationFixture(), snapshot = visualizationSnapshot();
    const utility = meter({ meterReadingDataApplication: 'fullMonth', canBeNegative: true });
    const value = { ...snapshot, account: { ...snapshot.account, energyUnit: 'kWh' }, facilities: snapshot.facilities.map(facility => ({ ...facility, fiscalYear: 'calendarYear' as const })),
      meters: [utility], meterData: amounts.map((amount, month) => reading({ guid: `r-${month}`, month: month + 1, totalEnergyUse: amount })) };
    const source: UtilityVisualizationSource = { ...base.sources[0] as UtilityVisualizationSource, dataMode: 'calendarized', groupBy: 'meter', aggregation: 'none', measure: 'energy',
      settings: { unit: { kind: 'pinned', value: 'kWh' }, energyTreatment: { kind: 'pinned', value: 'site' } }, selection: { kind: 'fixed', resource: 'meter', guids: ['meter-a'] } };
    const definition: VisualizationDefinition = { ...base, sources: [source], series: [{ id: 'all', sourceId: source.id, metric: 'energy', axis: 'left' }],
      chart: { kind: 'breakdown', type, values: 'absolute' }, period: { kind: 'fixed', start: '2026-01-01', end: '2026-02-28', basis: 'calendar' }, comparison: { kind: 'none' } };
    const request: VisualizationSourceRequest = { identity: { accountGuid: 'account-a', workspaceRevision: 1, definitionGuid: 'utility-composition', definitionRevision: 1,
      sourceId: source.id, requestId: 'utility-composition', scope: resolveVisualizationFacilities(definition, value.facilities).scope }, source, chart: definition.chart!, period: definition.period,
      comparison: definition.comparison, series: definition.series, dateContext: { calendarDate: '2026-11-17' } };
    const projected = calendarizedMeter(utility, amounts.map((amount, month) => monthlyData({ monthNumValue: month, energyUse: amount })), { energyUnit: 'kWh', consumptionUnit: 'kWh' });
    const resolution = resolveCalendarizedUtility(value, request, [projected]);
    const evidence: VisualizationSourceEvidence = { request, resolution, capabilities: utilityCapabilities(source), chartSupport: utilityChartSupport(source, request.chart) };
    return { value, definition, request, projected, evidence };
  }
  it('sums each canonical monthly observation once and retains original periods and zero', () => {
    const { value, definition, evidence } = setup(), before = structuredClone(value);
    expect(checkVisualizationCompatibility(definition, [evidence])).toMatchObject({ state: 'compatible' });
    if (evidence.resolution.state !== 'ready') throw new Error(JSON.stringify(evidence.resolution));
    const result = evidence.resolution.resolved;
    expect(result.data).toMatchObject({ kind: 'breakdown', items: [{ observation: { state: 'observed', value: 10 } }] });
    expect(result.composition!.contributions[0].details).toEqual(['2026-01-01 – 2026-01-31: 10', '2026-02-01 – 2026-02-28: 0']);
    expect(value).toEqual(before);
  });
  it('permits signed absolute bars and blocks the same negative contribution in donuts and percentage bars', () => {
    const signed = setup('bar', [-10, 0]);
    expect(checkVisualizationCompatibility(signed.definition, [signed.evidence]).state).toBe('compatible');
    const donut = setup('donut', [-10, 0]);
    expect(checkVisualizationCompatibility(donut.definition, [donut.evidence])).toMatchObject({ state: 'unavailable', reasons: expect.arrayContaining([expect.objectContaining({ code: 'data' })]) });
  });
  it('rejects partial-month boundaries and keeps missing monthly coverage partial rather than zero', () => {
    const { value, request, projected } = setup('donut', [10]);
    const result = resolveCalendarizedUtility(value, request, [projected]);
    if (result.state !== 'ready') throw new Error(JSON.stringify(result));
    expect(result.resolved.composition!.contributions[0].observation).toMatchObject({ state: 'observed', value: 10, partial: true });
    expect(resolveCalendarizedUtility(value, { ...request, period: { kind: 'fixed', start: '2026-01-15', end: '2026-02-28', basis: 'calendar' } }, [projected])).toMatchObject({ state: 'unsupported' });
  });
  it('attests the pinned fiscal year while retaining monthly source observations', () => {
    const { value, request, definition, evidence, projected } = setup();
    const period = { kind: 'fiscal-year' as const, year: 2026 }, pinned = { ...request, period };
    const resolution = resolveCalendarizedUtility(value, pinned, [projected]);
    expect(checkVisualizationCompatibility({ ...definition, period }, [{ ...evidence, request: pinned, resolution }]).state).toBe('compatible');
    if (resolution.state !== 'ready') throw new Error(JSON.stringify(resolution));
    expect(resolution.resolved.periods[0]).toMatchObject({ fiscalYear: 2026, start: '2026-01-01', end: '2026-12-31', interval: 'monthly' });
  });
});

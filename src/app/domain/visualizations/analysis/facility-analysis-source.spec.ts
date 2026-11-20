import type { VisualizationDefinition } from '../visualization-definition';
import { remapVisualizationDefinition } from '../visualization-references';
import { resolveVisualizationSeries } from '../visualization-series';
import { calculateFacilityAnalysisResults } from '@domain/calculations/analysis-calculations/facility-analysis-results-calculation';
import { checkVisualizationCompatibility } from '../visualization-capabilities';
import { analysisFixture, analysisDefinition, analysisSourceRequest } from '../testing/analysis-fixtures';
import { annualAnalysisChartValues, monthlyAnalysisSavingsValues } from '@domain/calculations/analysis-calculations/analysis-chart-values';
import { analysisPeriodIssue, facilityAnalysisCapabilities, facilityAnalysisChartSupport, resolveFacilityAnalysisResults, type FacilityVisualizationResults } from './facility-analysis-source';

function results(): FacilityVisualizationResults {
  const fixture = analysisFixture(), result = calculateFacilityAnalysisResults(fixture.request);
  return { scope: 'facility', analysis: fixture.analysis, facility: fixture.facility, monthly: result.monthlyAnalysisSummaryData, annual: result.annualAnalysisSummaries, groups: result.groupSummaries, reportYear: result.reportYear, groupOnly: false };
}
function ready(value: FacilityVisualizationResults, request = analysisSourceRequest()) {
  const result = resolveFacilityAnalysisResults(value, request);
  if (!(result.state === 'ready' || result.state === 'empty' && result.resolved) || result.resolved!.data.kind !== 'time-series') throw new Error(JSON.stringify(result));
  return { result: result as Extract<typeof result, { state: 'ready' }>, rows: result.resolved!.data.rows, points: result.resolved!.data.rows.map(row => Object.values(row.values)[0]) };
}
describe('facility analysis result projection', () => {
  it('projects signed rolling improvement directly with zero, nonfinite and absent-month gaps', () => {
    const value = results();
    const monthly = value.monthly.slice(0, 5).map((row, index) => ({ ...row, rolling12MonthImprovement: [10, -5, 0, Number.NaN, 9][index], missingValueWarning: index === 4 }));
    const projected = ready({ ...value, monthly: monthly.filter((_, index) => index !== 3) }, analysisSourceRequest(analysisDefinition('rolling-improvement')));
    expect(projected.points.map(point => point.value)).toEqual([10, -5, 0, null, 9]);
    expect(projected.points[4]).toMatchObject({ state: 'observed', partial: true });
    expect(ready({ ...value, monthly }, analysisSourceRequest(analysisDefinition('rolling-improvement'))).points[3].state).toBe('missing');
  });
  it.each([
    ['savings', [10, 0, 0, 0]], ['losses', [0, -5, 0, 0]],
    ['banked-savings', [0, 0, 12, 0]], ['banked-losses', [0, 0, 0, -7]]
  ] as const)('retains the established percentage split for %s', (measure, expected) => {
    const value = results(); value.analysis.hasBanking = true; value.analysis.groups[0].applyBanking = true;
    const monthly = value.monthly.slice(0, 4).map((row, index) => ({ ...row, isBanked: index >= 2, rolling12MonthImprovement: [10, -5, 12, -7][index] }));
    expect(ready({ ...value, monthly }, analysisSourceRequest(analysisDefinition(measure, 'group-a'))).points.map(point => point.value)).toEqual(expected);
  });
  it('maps exact result presentation by GUID while keeping unknown provider-local selectors dormant', () => {
    const base = analysisDefinition('actual', 'group-a');
    const definition: VisualizationDefinition = { ...base, series: [{ ...base.series[0], overrides: [{ seriesId: 'source-1:result', label: 'Unknown selector' }, { resourceGuid: 'group-a', color: '#123456' }] }] };
    const mapped = remapVisualizationDefinition(definition, 'destination', { analysis: { 'analysis-a': 'new-analysis' }, 'meter-group': { 'group-a': 'new-group' } });
    expect(mapped.issues).toEqual([]);
    expect(mapped.definition.sources[0]).toMatchObject({ analysisGuid: 'new-analysis', groupGuid: 'new-group' });
    const resolved = ready(results(), analysisSourceRequest(base)).result.resolved.series;
    const selected = resolveVisualizationSeries(mapped.definition, resolved.map(series => ({ ...series, resourceGuid: 'new-group' })));
    expect(selected[0].selected.color).toBe('#123456'); expect(selected[0].selected.label).not.toBe('Unknown selector');
  });

  it.each(['energy', 'water'] as const)('matches authoritative monthly and annual %s results and compatibility evidence', category => {
    const value = results(); value.analysis.analysisCategory = category;
    for (const measure of ['actual', 'calculated', 'annual-improvement', 'total-improvement'] as const) {
      const definition = analysisDefinition(measure), request = analysisSourceRequest(definition);
      const { result, points } = ready(value, request);
      const expected = measure === 'actual' ? value.monthly.map(row => row.energyUse) : measure === 'calculated' ? value.monthly.map(row => row.adjusted)
        : value.annual.map(row => annualAnalysisChartValues(row)[measure === 'annual-improvement' ? 'annualImprovement' : 'totalImprovement']);
      expect(points.map(point => point.value)).toEqual(expected);
      expect(result.resolved.series[0].unit).toBe(['actual', 'calculated'].includes(measure) ? category === 'energy' ? 'MMBtu' : value.analysis.waterUnit : '%');
      const compatibility = checkVisualizationCompatibility(definition, [{ request, resolution: result, capabilities: facilityAnalysisCapabilities(), chartSupport: facilityAnalysisChartSupport(request.source, request.chart) }]);
      expect(compatibility, JSON.stringify(compatibility)).toMatchObject({ state: 'compatible' });
    }
  });
  it('preserves signed losses, real zero, missing months and warned finite values', () => {
    const value = results();
    value.monthly[12].rolling12MonthImprovement = -12.5; value.monthly[13].energyUse = 0; value.monthly[13].missingValueWarning = true;
    const loss = ready(value, analysisSourceRequest(analysisDefinition('losses')));
    expect(loss.points[12]).toMatchObject({ state: 'observed', value: -12.5, provenance: 'savings' });
    const actual = ready({ ...value, monthly: value.monthly.filter((_, i) => i !== 14) });
    expect(actual.points[13]).toMatchObject({ state: 'observed', value: 0, partial: true });
    expect(actual.points[14]).toMatchObject({ state: 'missing', value: null });
    value.monthly[12].rolling12MonthImprovement = Number.NaN;
    expect(ready(value, analysisSourceRequest(analysisDefinition('losses'))).points[12].state).toBe('missing');
  });
  it('projects banking transitions before date filtering and preserves calculated gaps', () => {
    const value = results(); value.analysis.hasBanking = true; value.analysis.groups[0].applyBanking = true;
    const monthly = value.monthly.slice(0, 3).map((row, i) => ({ ...row, isBanked: true, isIntermediateBanked: i > 0, percentSavingsComparedToBaseline: i ? 88 : 7, rolling12MonthImprovement: i ? 99 : 7 }));
    const banked = { ...value, monthly };
    const request = { ...analysisSourceRequest(analysisDefinition('banked-savings', 'group-a')), period: { kind: 'fixed' as const, basis: 'calendar' as const, start: '2020-02-01', end: '2020-03-31' } };
    const projected = ready(banked, request);
    expect(projected.points.map(point => point.value)).toEqual([7, 7]);
    expect(monthlyAnalysisSavingsValues(monthly, true).map(row => row['bankedSavings'])).toEqual([7, 7, 7]);
    expect(ready(banked, { ...request, source: { ...analysisDefinition('calculated', 'group-a').sources[0] } }).points.every(point => point.state === 'excluded')).toBe(true);
  });
  it('preserves fiscal dates, annual transition exclusions and unavailable explicit years', () => {
    const value = results(); Object.assign(value.facility, { fiscalYear: 'nonCalendarYear', fiscalYearMonth: 6, fiscalYearCalendarEnd: true });
    const request = analysisSourceRequest(analysisDefinition('total-improvement'));
    expect(ready(value, request).rows[0]).toMatchObject({ start: '2019-07-01', end: '2020-06-30' });
    const empty = resolveFacilityAnalysisResults(value, { ...request, period: { kind: 'fiscal-year', year: 2030 } });
    expect(empty).toMatchObject({ state: 'empty', periods: [{ start: '2029-07-01', end: '2030-06-30' }] });
    expect(ready(value, { ...request, period: { kind: 'latest-saved-year', basis: 'fiscal' } }).rows).toHaveLength(1);
    const row = value.annual[0]; row.isIntermediateBanked = true;
    const yearly = { ...analysisSourceRequest(analysisDefinition('calculated')), chart: { kind: 'time-series' as const, defaultTraceType: 'line' as const, interval: 'yearly' as const, stack: 'none' as const } };
    expect(ready(value, yearly).points[0].state).toBe('excluded');
  });
  it('resolves rolling month windows independently of calculation and retains unchanged input records', () => {
    const value = results(), before = structuredClone(value);
    for (const anchor of ['calendar', 'latest-data'] as const) {
      const request = { ...analysisSourceRequest(), period: { kind: 'rolling' as const, count: 1, unit: 'year' as const, anchor, basis: 'calendar' as const, includeIncomplete: false } };
      const projected = ready(value, request);
      expect(projected.rows).toHaveLength(12); expect(projected.rows[0].start).toBe('2021-04-01'); expect(projected.rows.at(-1)?.end).toBe('2022-03-31');
    }
    expect(value).toEqual(before);
  });
  it('explains unsupported settings, excluded scope and missing/skipped group identities', () => {
    const value = results(), request = analysisSourceRequest();
    expect(resolveFacilityAnalysisResults(value, { ...request, comparison: { kind: 'previous-period' } }).state).toBe('unsupported');
    expect(analysisPeriodIssue({ ...request, period: { kind: 'fixed', start: '2020-01-02', end: '2020-02-29', basis: 'calendar' } })).toBeDefined();
    expect(resolveFacilityAnalysisResults(value, { ...request, source: { ...request.source, settings: { unit: { kind: 'pinned', value: 'gal' } } } }).state).toBe('unsupported');
    expect(resolveFacilityAnalysisResults(value, { ...request, identity: { ...request.identity, scope: { kind: 'portfolio', facilityGuids: ['other'] } } }).state).toBe('missing-source');
    expect(resolveFacilityAnalysisResults(value, analysisSourceRequest(analysisDefinition('actual', 'missing'))).state).toBe('missing-source');
    value.analysis.groups[0].analysisType = 'skip'; expect(resolveFacilityAnalysisResults(value, analysisSourceRequest(analysisDefinition('actual', 'group-a'))).state).toBe('missing-source');
  });
});

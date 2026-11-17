import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import type { AnalysisResultVisualizationSource, VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { checkVisualizationCompatibility } from '../visualization-capabilities';
import { resolveVisualizationFacilities } from '../visualization-facilities';
import { calculateAccountAnalysisResults } from '@domain/calculations/analysis-calculations/account-analysis-results-calculation';
import { annualAnalysisChartValues, monthlyAnalysisSavingsValues, monthlyAnalysisUseValues } from '@domain/calculations/analysis-calculations/analysis-chart-values';
import { accountAnalysisDefinition, accountAnalysisFixture, accountAnalysisSourceRequest } from '../testing/analysis-fixtures';
import { resolveAccountAnalysisResults, latestAnalysisMonth, facilityAnalysisCapabilities, facilityAnalysisChartSupport, type AccountVisualizationResults } from './facility-analysis-source';

function results(): AccountVisualizationResults {
  const fixture = accountAnalysisFixture(), value = calculateAccountAnalysisResults(fixture.request);
  return { scope: 'account', analysis: fixture.analysis, account: fixture.snapshot.account, selectedFacilityGuids: ['facility-a', 'facility-b'],
    annual: value.annualAnalysisSummaries, monthly: value.monthlyAnalysisSummaryData, reportYear: value.reportYear };
}
function project(value = results(), request = accountAnalysisSourceRequest()) {
  const resolved = resolveAccountAnalysisResults(value, request);
  if ((resolved.state !== 'ready' && resolved.state !== 'empty') || !resolved.resolved || resolved.resolved.data.kind !== 'time-series') throw new Error(JSON.stringify(resolved));
  return { resolved, rows: resolved.resolved.data.rows, points: resolved.resolved.data.rows.map(row => Object.values(row.values)[0]), series: resolved.resolved.series };
}
describe('saved account total analysis projection', () => {
  it.each(['fixed-multiple', 'all-single'] as const)('composes owned account results with %s inclusion and still rejects foreign ownership', inclusion => {
    const fixture = accountAnalysisFixture(), single = inclusion === 'all-single';
    const facilityGuids = single ? ['facility-a'] : ['facility-a', 'facility-b'];
    const account = { ...fixture.snapshot.account, isSingleFacilityCompany: single };
    const analysis = { ...fixture.analysis, facilityAnalysisItems: fixture.analysis.facilityAnalysisItems.filter(link => !single || facilityGuids.includes(link.facilityId)) };
    const calculated = calculateAccountAnalysisResults({ ...fixture.request, account, accountAnalysisItem: analysis,
      accountFacilities: fixture.request.accountFacilities.filter(facility => facilityGuids.includes(facility.guid)),
      allAccountAnalysisItems: fixture.request.allAccountAnalysisItems.filter(item => facilityGuids.includes(item.facilityId)),
      meters: fixture.request.meters.filter(meter => facilityGuids.includes(meter.facilityId)),
      meterData: fixture.request.meterData.filter(reading => facilityGuids.includes(reading.facilityId)) });
    const value: AccountVisualizationResults = { scope: 'account', analysis, account, selectedFacilityGuids: facilityGuids,
      monthly: calculated.monthlyAnalysisSummaryData, annual: calculated.annualAnalysisSummaries, reportYear: calculated.reportYear };
    const definition: VisualizationDefinition = { ...accountAnalysisDefinition(), facilitySelection: single ? { kind: 'all' } : { kind: 'fixed', facilityGuids } };
    const base = accountAnalysisSourceRequest(definition), request = { ...base, identity: { ...base.identity,
      scope: resolveVisualizationFacilities(definition, fixture.snapshot.facilities.filter(facility => !single || facilityGuids.includes(facility.guid))).scope } };
    const resolution = resolveAccountAnalysisResults(value, request);
    expect(resolution.state).toBe('ready');
    if (resolution.state !== 'ready') throw new Error('Expected scoped account results');
    const evidence = { request, resolution, capabilities: facilityAnalysisCapabilities(), chartSupport: facilityAnalysisChartSupport(request.source, request.chart) };
    expect(checkVisualizationCompatibility(definition, [evidence]).state).toBe('compatible');
    const { accountAnalysisFacilityGuids: _proof, ...withoutProof } = resolution.resolved;
    expect(checkVisualizationCompatibility(definition, [{ ...evidence, resolution: { ...resolution, resolved: withoutProof } }])).toMatchObject({
      state: 'unavailable', reasons: expect.arrayContaining([expect.objectContaining({ code: 'ownership' })]) });
    expect(checkVisualizationCompatibility(definition, [{ ...evidence, resolution: { ...resolution,
      resolved: { ...resolution.resolved, accountAnalysisFacilityGuids: ['excluded-facility'] } } }])).toMatchObject({
      state: 'unavailable', reasons: expect.arrayContaining([expect.objectContaining({ code: 'ownership' })]) });
    expect(checkVisualizationCompatibility(definition, [{ ...evidence, resolution: { ...resolution,
      resolved: { ...resolution.resolved, references: resolution.resolved.references.map(reference => ({ ...reference, accountGuid: 'foreign' })) } } }])).toMatchObject({
        state: 'unavailable', reasons: expect.arrayContaining([expect.objectContaining({ code: 'ownership' })]) });
  });
  it.each(['energy', 'water'] as const)('matches all account workbench chart measures for %s', category => {
    const value = results(); value.analysis.analysisCategory = category;
    for (const measure of ['actual', 'calculated', 'savings', 'losses', 'annual-improvement', 'total-improvement'] as const) {
      const request = accountAnalysisSourceRequest(accountAnalysisDefinition(measure)), actual = project(value, request);
      const expected = measure === 'actual' || measure === 'calculated' ? value.monthly.map(row => monthlyAnalysisUseValues(row)[measure])
        : measure === 'savings' || measure === 'losses' ? monthlyAnalysisSavingsValues(value.monthly, false).map(row => row[measure])
          : value.annual.map(row => annualAnalysisChartValues(row)[measure === 'annual-improvement' ? 'annualImprovement' : 'totalImprovement']);
      expect(actual.points.map(point => point.value)).toEqual(expected);
      expect(actual.series[0]).toMatchObject({ resourceGuid: 'account-analysis', unit: ['actual', 'calculated'].includes(measure) ? category === 'energy' ? 'kWh' : value.analysis.waterUnit : '%' });
      expect(actual.resolved.resolved!.references).toEqual([{ kind: 'analysis', id: 'account-analysis', accountGuid: 'account-a' }]);
    }
    expect(project(value).points[0].value).toBe(300);
  });
  it('retains authoritative child-to-account unit conversion without adding display conversions', () => {
    const fixture = accountAnalysisFixture();
    const result = calculateAccountAnalysisResults({ ...fixture.request, accountAnalysisItem: { ...fixture.analysis, energyUnit: 'MMBtu' },
      allAccountAnalysisItems: fixture.request.allAccountAnalysisItems.map((analysis, index) => ({ ...analysis, energyUnit: index ? 'MMBtu' : 'kWh' })) });
    const value: AccountVisualizationResults = { scope: 'account', analysis: { ...fixture.analysis, energyUnit: 'MMBtu' }, account: fixture.snapshot.account,
      selectedFacilityGuids: ['facility-a', 'facility-b'], monthly: result.monthlyAnalysisSummaryData, annual: result.annualAnalysisSummaries, reportYear: result.reportYear };
    expect(project(value).points[0].value).toBeCloseTo(new ConvertValue(300, 'kWh', 'MMBtu').convertedValue, 8);
    expect(project(value).series[0]).toMatchObject({ unit: 'MMBtu', energyTreatment: 'site' });
  });
  it('uses account fiscal intervals and result horizon without changing child inputs or calculation dates', () => {
    const value = results(), before = structuredClone(value);
    const annual = accountAnalysisSourceRequest(accountAnalysisDefinition('total-improvement'));
    for (const endNaming of [true, false]) {
      const fiscal = { ...value, account: { ...value.account, fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: endNaming } };
      expect(project(fiscal, annual).rows[0]).toMatchObject({ start: endNaming ? '2019-07-01' : '2020-07-01', end: endNaming ? '2020-06-30' : '2021-06-30' });
      expect(project(fiscal, { ...annual, period: { kind: 'latest-saved-year', basis: 'fiscal' } }).rows.at(-1)?.periodKey).toBe('FY 2021');
      expect(project(fiscal, { ...annual, period: { kind: 'fiscal-year', year: 2030 } }).points[0].state).toBe('missing');
    }
    for (const anchor of ['calendar', 'latest-data'] as const) {
      const request = { ...accountAnalysisSourceRequest(), period: { kind: 'rolling' as const, count: 1, unit: 'year' as const, anchor, basis: 'calendar' as const, includeIncomplete: false } };
      expect(project(value, request).rows).toHaveLength(12);
      expect(project(value, request).rows.at(-1)?.end).toBe(latestAnalysisMonth(value));
    }
    expect(value).toEqual(before);
  });
  it('keeps aggregate banking values, signed losses, zero, warnings and gaps', () => {
    const value = results();
    value.monthly[12].rolling12MonthImprovement = -7;
    value.monthly[13].energyUse = 0; value.monthly[13].missingValueWarning = true;
    value.monthly[14].adjusted = Number.NaN;
    expect(project(value, accountAnalysisSourceRequest(accountAnalysisDefinition('losses'))).points[12]).toMatchObject({ value: -7 });
    expect(project(value).points[13]).toMatchObject({ value: 0, partial: true });
    expect(project(value, accountAnalysisSourceRequest(accountAnalysisDefinition('calculated'))).points[14].state).toBe('missing');
    value.monthly[12].rolling12MonthImprovement = Number.NaN;
    expect(project(value, accountAnalysisSourceRequest(accountAnalysisDefinition('losses'))).points[12].state).toBe('missing');
    expect(project({ ...value, monthly: value.monthly.filter((_, i) => i !== 14) }).points[14].state).toBe('missing');
    expect(project({ ...value, monthly: [], annual: [] }).resolved.state).toBe('empty');
  });
  it('requires every selected facility but permits extras and excluded skipped facilities, without altering saved intent', () => {
    const value = results(), base = accountAnalysisSourceRequest(), before = structuredClone(value);
    const included = (facilityGuids: string[]) => ({ ...base, identity: { ...base.identity, scope: { kind: 'portfolio' as const, facilityGuids } } });
    expect(resolveAccountAnalysisResults(value, included(['facility-a', 'facility-b'])).state).toBe('ready');
    expect(resolveAccountAnalysisResults(value, included(['facility-a']))).toMatchObject({ state: 'unsupported', message: expect.stringContaining('Include every selected facility') });
    expect(resolveAccountAnalysisResults(value, { ...base, source: { ...accountAnalysisDefinition('actual').sources[0] as AnalysisResultVisualizationSource, groupGuid: 'group-a' } }).state).toBe('unsupported');
    expect(resolveAccountAnalysisResults(value, accountAnalysisSourceRequest(accountAnalysisDefinition('banked-savings'))).state).toBe('unsupported');
    expect(value).toEqual(before);
  });
});

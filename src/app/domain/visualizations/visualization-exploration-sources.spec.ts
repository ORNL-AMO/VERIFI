import { getNewIdbPredictor } from '@data/models/idbModels/predictor';
import { getNewIdbPredictorData } from '@data/models/idbModels/predictorData';
import { getNewIdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { calculateFacilityAnalysisResults } from '@domain/calculations/analysis-calculations/facility-analysis-results-calculation';
import { analysisDefinition, analysisFixture, analysisSourceRequest } from './testing/analysis-fixtures';
import { utilityVisualizationFixture } from './testing/visualization-fixtures';
import { checkVisualizationCompatibility } from './visualization-capabilities';
import { prepareExploration } from './visualization-exploration';
import { resolveCalendarizedUtility } from './utility/utility-calendarized';
import { utilityCapabilities, utilityChartSupport } from './utility/utility-capabilities';
import { predictorCapabilities, predictorChartSupport, resolvePredictor } from './predictor/predictor-source';
import { facilityAnalysisCapabilities, facilityAnalysisChartSupport, resolveFacilityAnalysisResults } from './analysis/facility-analysis-source';
import type { PredictorVisualizationSource, VisualizationDefinition } from './visualization-definition';
import type { VisualizationSourceEvidence } from './visualization-source-provider';

describe('exploration across current source families', () => {
  it('pairs actual monthly utility, saved predictor and authoritative analysis observations without conversions or cross-source totals', async () => {
    const fixture = analysisFixture();
    const meter = { ...fixture.snapshot.meters[0], meterReadingDataApplication: 'fullMonth' as const };
    const predictor = { ...getNewIdbPredictor('account-a', 'facility-a'), guid: 'production', name: 'Production', unit: 'widgets' };
    const snapshot = { ...fixture.snapshot, account: { ...fixture.snapshot.account, energyUnit: 'MMBtu' }, facilities: [{ ...fixture.facility, energyUnit: 'MMBtu' }],
      meters: [meter], predictors: [predictor],
      meterData: Array.from({ length: 6 }, (_, month) => ({ ...getNewIdbUtilityMeterData(meter, []), guid: `bill-${month}`, year: 2020, month: month + 1, totalEnergyUse: 100 })),
      predictorData: Array.from({ length: 6 }, (_, month) => ({ ...getNewIdbPredictorData(predictor), guid: `production-${month}`, year: 2020, month: month + 1, amount: month * 10 })) };
    const utility = utilityVisualizationFixture().sources[0]; if (utility.kind !== 'utility') throw new Error('Utility fixture expected');
    const utilitySource = { ...utility, settings: { unit: { kind: 'owner' as const } } };
    const predictorSource: PredictorVisualizationSource = { id: 'predictors', kind: 'predictor', measure: 'value', aggregation: 'none', selection: { kind: 'fixed', resource: 'predictor', guids: [predictor.guid] } };
    const definition: VisualizationDefinition = { ...analysisDefinition(), chart: { kind: 'correlation', scale: 'raw', statistic: 'r' },
      period: { kind: 'fixed', start: '2020-01-01', end: '2020-06-30', basis: 'calendar' },
      sources: [...analysisDefinition().sources, utilitySource, predictorSource],
      series: [...analysisDefinition().series, ...utilityVisualizationFixture().series, { id: 'production', sourceId: predictorSource.id, metric: 'value', resourceGuid: predictor.guid, axis: 'left' }] };
    const base = { ...analysisSourceRequest(definition), dateContext: { calendarDate: '2026-11-17', monthlyRange: { start: '2020-01-01', end: '2020-06-30' } } };
    const calculation = calculateFacilityAnalysisResults(fixture.request);
    const evidence: VisualizationSourceEvidence[] = definition.sources.map(source => {
      const request = { ...base, identity: { ...base.identity, sourceId: source.id }, source, series: definition.series.filter(series => series.sourceId === source.id) };
      if (source.kind === 'utility') return { request, capabilities: utilityCapabilities(source), chartSupport: utilityChartSupport(source, request.chart), resolution: resolveCalendarizedUtility(snapshot, request, fixture.meters.map(value => ({ ...value, meter }))) };
      if (source.kind === 'predictor') return { request, capabilities: predictorCapabilities(), chartSupport: predictorChartSupport(source, request.chart), resolution: resolvePredictor(snapshot, request) };
      return { request, capabilities: facilityAnalysisCapabilities(), chartSupport: facilityAnalysisChartSupport(source, request.chart), resolution: resolveFacilityAnalysisResults({ scope: 'facility', analysis: fixture.analysis, facility: fixture.facility,
        monthly: calculation.monthlyAnalysisSummaryData, annual: calculation.annualAnalysisSummaries, groups: calculation.groupSummaries, reportYear: calculation.reportYear, groupOnly: false }, request) };
    });
    const compatibility = checkVisualizationCompatibility(definition, evidence);
    expect(compatibility, JSON.stringify(compatibility)).toMatchObject({ state: 'compatible' });
    const model = await prepareExploration(definition, evidence, new AbortController().signal);
    expect(model.pairs).toHaveLength(3); expect(model.pairs.map(pair => pair.count)).toEqual([6, 6, 6]);
    expect(model.series.map(series => series.unit)).toEqual(['MMBtu', 'MMBtu', 'widgets']);
    const heatmap: VisualizationDefinition = { ...definition, chart: { kind: 'heatmap', dimension: 'series-period', scale: 'linear' } };
    const forChart = (definition: VisualizationDefinition) => evidence.map(entry => ({ ...entry, request: { ...entry.request, chart: definition.chart! }, chartSupport: { state: 'supported' as const, chart: definition.chart! } }));
    expect(checkVisualizationCompatibility(heatmap, forChart(heatmap)).state).toBe('unavailable');
    const normalized = { ...heatmap, chart: { kind: 'heatmap' as const, dimension: 'series-period' as const, scale: 'diverging' as const, normalization: 'z-score' as const } };
    expect(checkVisualizationCompatibility(normalized, forChart(normalized)).state).toBe('compatible');

    const emptySnapshot = { ...snapshot, predictors: [], predictorData: [] };
    const wildcard: VisualizationDefinition = { ...definition,
      sources: definition.sources.map(source => source.kind === 'predictor' ? { ...source, selection: { kind: 'rule', resource: 'predictor', filter: {} } } : source),
      series: definition.series.map(series => series.sourceId === predictorSource.id ? { id: 'all-predictors', sourceId: predictorSource.id, metric: 'value', axis: 'left' } : series) };
    const emptyCatalogEvidence = evidence.map(entry => {
      if (entry.request.source.kind !== 'predictor') return entry;
      const request = { ...entry.request, source: wildcard.sources.find(source => source.id === predictorSource.id)!, series: wildcard.series.filter(series => series.sourceId === predictorSource.id) };
      return { ...entry, request, resolution: resolvePredictor(emptySnapshot, request) };
    });
    expect(emptyCatalogEvidence.at(-1)!.resolution).toMatchObject({ state: 'empty', resolved: { series: [] } });
    expect(checkVisualizationCompatibility(wildcard, emptyCatalogEvidence)).toMatchObject({ state: 'compatible' });
    expect((await prepareExploration(wildcard, emptyCatalogEvidence, new AbortController().signal)).pairs).toHaveLength(1);
    const missingFixed = evidence.map(entry => entry.request.source.kind === 'predictor' ? { ...entry, resolution: resolvePredictor(emptySnapshot, entry.request) } : entry);
    expect(checkVisualizationCompatibility(definition, missingFixed).state).toBe('unavailable');
  });
});

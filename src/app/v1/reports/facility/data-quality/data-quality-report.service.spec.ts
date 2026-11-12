import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { resolveDataQualitySelection } from '@domain/reports/data-quality-report-selection';
import { DataQualityReportService } from './data-quality-report.service';
import { DataQualityReportEditor } from './editing/data-quality-report-editor.service';
import { dataQualitySettingsDraft } from './data-quality-report-settings';
import { dataQualityReadingsSnapshot, dataQualityPredictorReadingsSnapshot } from './testing/data-quality-report-test-fixtures';

function setup() {
  const snapshot = signal<AccountWorkspaceSnapshot>(dataQualityReadingsSnapshot());
  const report = computed(() => snapshot().facilityReports[0]);
  const draft = signal({ name: report().name, settings: dataQualitySettingsDraft(report().dataQualityReportSettings) });
  const stage = signal('report'), state = signal('idle'), pending = signal(false);
  const selection = computed(() => resolveDataQualitySelection({ accountGuid: snapshot().account.guid, facilityGuid: report().facilityId,
    settings: draft().settings,
    facilityAnalyses: snapshot().facilityAnalyses, meters: snapshot().meters, predictors: snapshot().predictors }));
  const editor = { draft, state, selection, setupValid: computed(() => selection().valid),
    context: { report, stage, key: () => `account-a:facility-a:${report().guid}`,
      workspace: { snapshot, isReady: () => true, status: () => 'ready', hasPending: pending } } };
  TestBed.configureTestingModule({ providers: [DataQualityReportService, { provide: DataQualityReportEditor, useValue: editor }] });
  return { service: TestBed.inject(DataQualityReportService), snapshot, draft, stage, state, pending };
}
async function ready(service: DataQualityReportService) {
  await vi.waitFor(() => { TestBed.tick(); expect(service.state().state).toBe('ready'); });
}
describe('Data Quality meter result session', () => {
  afterEach(() => vi.restoreAllMocks());
  it('prepares cloneable export inputs with current bins without recalculating or modifying the draft', async () => {
    const { service, snapshot, draft, stage, pending } = setup();
    snapshot.set(dataQualityPredictorReadingsSnapshot());
    expect(service.exportSnapshot()).toBeUndefined();
    await ready(service);
    const result = service.state().value, savedDraft = draft();
    expect(service.exportSnapshot()!.identity).toEqual({ scope: 'facility', accountGuid: 'account-a',
      facilityGuid: 'facility-a', reportGuid: 'report-a' });
    expect(service.exportSnapshot()!.histogramBinCounts).toEqual({
      'meter-meter-a-consumption': 50, 'meter-meter-a-cost': 50, 'predictor-predictor-a': 50
    });
    service.setHistogramBinCount('meter-meter-a-consumption', 7);
    service.setHistogramBinCount('predictor-predictor-a', 12);
    service.setHistogramBinCount('predictor-predictor-a', 0);
    const prepared = service.exportSnapshot()!;
    expect(prepared.histogramBinCounts['meter-meter-a-consumption']).toBe(7);
    expect(prepared.histogramBinCounts['predictor-predictor-a']).toBe(12);
    expect(service.state().value).toBe(result);
    expect(draft()).toBe(savedDraft);
    const cloned = structuredClone(prepared);
    expect(cloned).toEqual(prepared);
    expect(cloned.results.meters[0].chartRows[0].date).toBeInstanceOf(Date);
    cloned.facility.name = 'Detached facility';
    cloned.settings.selectedMeterIds.push('unrelated');
    cloned.results.meters[0].meterData[0].totalCost = -123;
    expect(snapshot().facilities[0].name).not.toBe('Detached facility');
    expect(draft().settings.selectedMeterIds).toEqual(['meter-a']);
    expect(service.state().value!.meters[0].meterData[0].totalCost).toBe(20);
    pending.set(true);
    expect(service.exportSnapshot()).toBeUndefined();
    pending.set(false);
    await ready(service);
    stage.set('setup');
    expect(service.exportSnapshot()).toBeUndefined();
    stage.set('report');
    await ready(service);
    expect(service.exportSnapshot()!.histogramBinCounts['predictor-predictor-a']).toBe(12);
  });
  it('calculates full-history statistics, units, zero-MAD outliers, and duplicate months in both selection modes', async () => {
    const { service, draft } = setup(); await ready(service);
    const meter = service.state().value!.meters[0];
    expect(meter.energyStats).toMatchObject({ min: 10, max: 100, average: 32.5, median: 10, medianAbsDev: 0, outliers: 1 });
    expect(meter.chartRows).toHaveLength(4); expect(meter.duplicateMonths[0].monthYear).toBe('Jan 2024');
    expect(meter.unit).toBe(meter.meter.energyUnit);
    draft.update(value => ({ ...value, settings: { ...value.settings, selectedMode: 'analysis', selectedAnalysisItemId: 'analysis-a' } }));
    expect(service.state().value).toBeUndefined(); await ready(service);
    expect(service.state().value!.meters.map(report => report.meter.guid)).toEqual(['meter-a', 'meter-b']);
  });
  it('suppresses stale results immediately, reuses cached data across stages and unrelated edits, and refreshes changed readings', async () => {
    const { service, snapshot, stage, pending } = setup(); await ready(service);
    const original = service.state().value!.meters;
    snapshot.update(value => ({ ...value, account: { ...value.account, name: 'Renamed account' } }));
    expect(service.state().value!.meters).toBe(original);
    stage.set('setup'); expect(service.state().value).toBeUndefined(); TestBed.tick();
    stage.set('report'); await ready(service); expect(service.state().value!.meters).toBe(original);
    pending.set(true); expect(service.state().value).toBeUndefined(); TestBed.tick();
    pending.set(false); await ready(service); expect(service.state().value!.meters).toBe(original);
    snapshot.update(value => ({ ...value, meterData: value.meterData.map((reading, index) => index ? reading : { ...reading, totalEnergyUse: 50 }) }));
    expect(service.state().value).toBeUndefined(); await ready(service);
    expect(service.state().value!.meters[0].energyStats.average).toBe(42.5);
  });
  it('reports actionable input errors and recovers after the workspace is repaired', async () => {
    const { service, snapshot } = setup();
    const original = snapshot(); snapshot.set({ ...original, facilities: [] });
    await vi.waitFor(() => { TestBed.tick(); expect(service.state().state).toBe('error'); });
    expect(service.state().message).toContain('facility is unavailable'); expect(service.state().value).toBeUndefined();
    service.retry(); TestBed.tick(); expect(service.state().state).toBe('error');
    snapshot.set(original); service.retry(); await ready(service);
  });
  it('does not calculate meters on Setup or for predictor-only selections', async () => {
    const { service, stage, draft } = setup(); stage.set('setup'); TestBed.tick();
    expect(service.state().state).toBe('idle'); expect(service.state().value).toBeUndefined();
    stage.set('report'); draft.update(value => ({ ...value, settings: { ...value.settings, selectedMeterIds: [] } }));
    await ready(service); expect(service.state().value!.meters).toEqual([]);
    draft.update(value => ({ ...value, settings: { ...value.settings, selectedMeterIds: ['meter-a'], includeMeterStatisticsTable: false,
      includeMeterConsumptionTimeseriesGraph: false, includeMeterCostTimeseriesGraph: false } }));
    await ready(service); expect(service.state().value!.meters).toHaveLength(1);
  });
  it('calculates predictor-only reports with full history and selects only predictors used by the analysis', async () => {
    const { service, snapshot, draft } = setup(); snapshot.set(dataQualityPredictorReadingsSnapshot());
    draft.update(value => ({ ...value, settings: { ...value.settings, selectedMeterIds: [] } }));
    await ready(service);
    expect(service.state().value!.meters).toEqual([]);
    const predictor = service.state().value!.predictors[0];
    expect(predictor.statistics).toEqual({ min: 10, max: 100, average: 28.6, median: 11, medianAbsDev: 1,
      lowerExpectedBound: 6, upperExpectedBound: 16, outliers: 1 });
    expect(predictor.unit).toBe('tons'); expect(predictor.chartRows).toHaveLength(5);
    expect(predictor.duplicateMonths.map(month => month.key)).toEqual(['2024-01']);
    expect(predictor.missingMonths.map(month => month.key)).toEqual(['2024-02']);
    snapshot.update(value => ({ ...value, facilityAnalyses: value.facilityAnalyses.map(analysis => ({ ...analysis,
      groups: analysis.groups.map(group => ({ ...group, predictorVariables: group.predictorVariables.map(variable => ({ ...variable,
        productionInAnalysis: variable.id === 'predictor-b' })) })) })) }));
    draft.update(value => ({ ...value, settings: { ...value.settings, selectedMode: 'analysis', selectedAnalysisItemId: 'analysis-a' } }));
    expect(service.state().value).toBeUndefined(); await ready(service);
    expect(service.state().value!.predictors.map(result => result.predictor.guid)).toEqual(['predictor-b']);
  });
  it('invalidates changed predictor readings immediately, retains the zero-MAD exception, and skips disabled predictor sections', async () => {
    const { service, snapshot, draft, stage } = setup(); snapshot.set(dataQualityPredictorReadingsSnapshot()); await ready(service);
    const original = service.state().value!.predictors;
    stage.set('setup'); TestBed.tick(); stage.set('report'); await ready(service);
    expect(service.state().value!.predictors).toBe(original);
    snapshot.update(value => ({ ...value, predictorData: value.predictorData.map(reading => ({ ...reading, amount: 10 })) }));
    expect(service.state().value).toBeUndefined(); await ready(service);
    expect(service.state().value!.predictors[0].statistics).toMatchObject({ medianAbsDev: 0, outliers: 0 });
    expect(service.state().value!.predictors[0].chartRows.every(row => !row.outlier)).toBe(true);
    draft.update(value => ({ ...value, settings: { ...value.settings, includePredictorStatisticsTable: false, includePredictorTimeseriesGraph: false,
      includePredictorHistogram: false } }));
    await ready(service); expect(service.state().value!.predictors).toEqual([]);
  });
  it('retains independent, validated histogram preferences across stages without invalidating results or saving settings', async () => {
    const { service, stage, draft } = setup(); await ready(service);
    const original = service.state().value, settings = draft();
    const consumption = service.histogramBinCount('meter-a-consumption'), cost = service.histogramBinCount('meter-a-cost');
    expect(consumption()).toBe(50); service.setHistogramBinCount('meter-a-consumption', 7);
    expect(consumption()).toBe(7); expect(cost()).toBe(50);
    service.setHistogramBinCount('meter-a-consumption', 0); expect(consumption()).toBe(7);
    expect(service.state().value).toBe(original); expect(draft()).toBe(settings);
    stage.set('setup'); TestBed.tick(); stage.set('report'); await ready(service);
    expect(service.histogramBinCount('meter-a-consumption')()).toBe(7);
  });
  it('cancels scheduled calculation work when leaving Report before it finishes', () => {
    vi.useFakeTimers();
    try {
      const { service, stage } = setup(); TestBed.tick();
      expect(service.state().state).toBe('loading');
      stage.set('setup'); expect(service.state().value).toBeUndefined(); TestBed.tick();
      vi.runAllTimers(); TestBed.tick();
      expect(service.state().state).toBe('idle'); expect(service.state().value).toBeUndefined();
    } finally { vi.useRealTimers(); }
  });
});

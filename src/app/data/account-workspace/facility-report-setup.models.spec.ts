import { getAnalysisReportSettings, getDataQualityReportSettings } from '@data/models/idbModels/facilityReport';
import { mergeFacilityAnalysisSettings, mergeFacilityDataQualitySettings } from './facility-report-setup.models';
describe('facility report setup patches', () => {
  it('merges Data Quality edits without defaulting absent optional flags or mutating GUID arrays', () => {
    const saved = getDataQualityReportSettings();
    saved.selectedAnalysisItemId = 'analysis-a'; saved.selectedMeterIds = ['meter-a'];
    delete saved.includeAnnualTotalsTable;
    const merged = mergeFacilityDataQualitySettings(saved, { selectedMode: 'manual', selectedAnalysisItemId: null,
      selectedPredictorIds: ['predictor-a', 'predictor-a'], includeMeterCostHistogram: false });
    expect(merged).toMatchObject({ selectedMode: 'manual', selectedMeterIds: ['meter-a'], selectedPredictorIds: ['predictor-a'], includeMeterCostHistogram: false });
    expect(merged.selectedAnalysisItemId).toBeUndefined(); expect(merged.includeAnnualTotalsTable).toBeUndefined();
    expect(saved.selectedAnalysisItemId).toBe('analysis-a'); expect(saved.includeMeterCostHistogram).toBe(true);
    merged.selectedMeterIds!.push('changed'); expect(saved.selectedMeterIds).toEqual(['meter-a']);
  });
  it.each([{ selectedMode: 'other' }, { selectedMeterIds: [1] }, { selectedPredictorIds: null },
    { selectedAnalysisItemId: '' }, { includeMeter: 'true' }, { missingSelection: false }, { unknown: true }])('rejects malformed Data Quality patches: %j', changes => {
    expect(() => mergeFacilityDataQualitySettings(getDataQualityReportSettings(), changes as never)).toThrow('invalid');
  });
  it('merges nested edits and explicit year clearing without mutating durable settings', () => {
    const saved = getAnalysisReportSettings(); saved.reportYear = 2024; saved.facilityAnnualResultsGraphs = false;
    saved.analysisTableColumns.bankedSavings = true;
    const merged = mergeFacilityAnalysisSettings(saved, { reportYear: null, groupReports: false, analysisTableColumns: { savings: true } });
    expect(merged.reportYear).toBeUndefined(); expect(merged.groupReports).toBe(false);
    expect(merged.facilityAnnualResultsGraphs).toBe(false); expect(merged.analysisTableColumns.bankedSavings).toBe(true);
    expect(merged.analysisTableColumns.savings).toBe(true); expect(saved.analysisTableColumns.savings).toBe(false);
  });
  it('merges contribution switches independently and preserves hidden format choices', () => {
    const saved = getAnalysisReportSettings();
    saved.facilityGroupContributions = true; saved.facilityGroupContributionsTable = false;
    const merged = mergeFacilityAnalysisSettings(saved, { facilityGroupContributions: false, facilityGroupContributionsGraphs: false });
    expect(merged).toMatchObject({ facilityGroupContributions: false,
      facilityGroupContributionsTable: false, facilityGroupContributionsGraphs: false });
    expect(saved).toMatchObject({ facilityGroupContributions: true,
      facilityGroupContributionsTable: false, facilityGroupContributionsGraphs: true });
  });
  it.each([{ reportYear: 2024.5 }, { groupReports: 'yes' }, { unknown: true },
    { facilityGroupContributions: 'yes' }, { facilityGroupContributionsTable: null }, { facilityGroupContributionsGraphs: 1 },
    { analysisTableColumns: { unknown: true } }, { analysisTableColumns: { predictors: [{ display: true }] } }])('rejects malformed persisted patches: %j', changes => {
    expect(() => mergeFacilityAnalysisSettings(getAnalysisReportSettings(), changes as never)).toThrow('invalid');
  });
});

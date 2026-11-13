import { getNewAnalysisGroup } from '@data/models/idbModels/analysisItem';
import { getDataQualityReportSettings } from '@data/models/idbModels/facilityReport';
import { regressionAnalysisReportFixture } from './testing/analysis-report-fixtures';
import { resolveDataQualitySelection } from './data-quality-report-selection';

function fixture() {
  const snapshot = regressionAnalysisReportFixture();
  const settings = { ...getDataQualityReportSettings(), selectedAnalysisItemId: 'facility-analysis' };
  return { ...snapshot, accountGuid: 'account', facilityGuid: 'facility', settings,
    meters: snapshot.meters.map(item => ({ ...item })), predictors: snapshot.predictors.map(item => ({ ...item })),
    facilityAnalyses: snapshot.facilityAnalyses.map(item => ({ ...item, groups: [...item.groups] })) };
}

describe('Data Quality report selection', () => {
  it('resolves analyses from selection-only settings with no content flags or source arrays', () => {
    const input = fixture();
    const result = resolveDataQualitySelection({ ...input,
      settings: { selectedMode: 'analysis', selectedAnalysisItemId: 'facility-analysis' } });
    expect(result).toEqual(resolveDataQualitySelection(input));
    expect(result.valid).toBe(true);
  });
  it('accepts minimal manual settings with readonly GUID arrays and preserves deduplication', () => {
    const settings = { selectedMode: 'manual', selectedMeterIds: ['meter', 'meter'], selectedPredictorIds: ['predictor-1'] } as const;
    const result = resolveDataQualitySelection({ ...fixture(), settings });
    expect(result.valid).toBe(true);
    expect(result.meters.map(meter => meter.guid)).toEqual(['meter']);
    expect(result.predictors.map(predictor => predictor.guid)).toEqual(['predictor-1']);
  });
  it.each([null, undefined])('treats an unset analysis ID (%s) as incomplete without normalizing the caller', selectedAnalysisItemId => {
    const settings = { selectedMode: 'analysis' as const, selectedAnalysisItemId };
    expect(resolveDataQualitySelection({ ...fixture(), settings })).toMatchObject({
      valid: false, analysis: undefined, meters: [], predictors: []
    });
    expect(settings.selectedAnalysisItemId).toBe(selectedAnalysisItemId);
  });
  it.each(['analysis', 'manual'] as const)('accepts omitted analysis and source IDs in older %s settings', selectedMode => {
    expect(resolveDataQualitySelection({ ...fixture(), settings: { selectedMode } })).toMatchObject({
      valid: false, analysis: undefined, meters: [], predictors: []
    });
  });
  it.each(['skip', 'skipAnalysis', 'deleted sources'] as const)('blocks analyses resolving to no sources: %s', reason => {
    const input = fixture();
    if (reason === 'deleted sources') {
      input.meters = []; input.facilityAnalyses[0].groups[0].predictorVariables = [];
    } else input.facilityAnalyses[0].groups.forEach(group => group.analysisType = reason);
    expect(resolveDataQualitySelection(input)).toMatchObject({ valid: false, meters: [], predictors: [] });
  });
  it.each(['energyIntensity', 'modifiedEnergyIntensity', 'regression'] as const)('resolves %s production predictors and deduplicates groups', method => {
    const input = fixture(), group = input.facilityAnalyses[0].groups[0];
    group.analysisType = method;
    group.isGeneratedModel = false;
    group.predictorVariables[1].productionInAnalysis = false;
    input.facilityAnalyses[0].groups = [group, structuredClone(group), { ...getNewAnalysisGroup('skip', []), analysisType: 'skip' }];
    const before = structuredClone(input);
    const result = resolveDataQualitySelection(input);
    expect(result.meters.map(item => item.guid)).toEqual(['meter']);
    expect(result.predictors.map(item => item.guid)).toEqual(['predictor-0']);
    expect(result.valid).toBe(true);
    expect(input).toEqual(before);
  });
  it('uses only the selected generated regression model, excluding candidates and skipped groups', () => {
    const input = fixture(), group = input.facilityAnalyses[0].groups[0];
    group.isGeneratedModel = true;
    group.selectedModelId = 'chosen';
    group.models = [{ modelId: 'other', predictorVariables: [group.predictorVariables[0]] },
      { modelId: 'chosen', predictorVariables: [group.predictorVariables[1]] }] as typeof group.models;
    input.facilityAnalyses[0].groups.push({ ...group, analysisType: 'skipAnalysis' });
    expect(resolveDataQualitySelection(input).predictors.map(item => item.guid)).toEqual(['predictor-1']);
    group.models = [];
    expect(resolveDataQualitySelection(input).predictors).toEqual([]);
    expect(resolveDataQualitySelection(input).valid).toBe(true);
  });
  it('uses manual GUIDs without applying analysis membership or calendar/year restrictions', () => {
    const input = fixture();
    input.settings = { ...input.settings, selectedMode: 'manual', selectedMeterIds: ['meter', 'meter'], selectedPredictorIds: ['predictor-1'] };
    expect(resolveDataQualitySelection(input)).toMatchObject({ valid: true, analysis: undefined });
    expect(resolveDataQualitySelection(input).meters).toHaveLength(1);
    input.settings.selectedMeterIds = [];
    expect(resolveDataQualitySelection(input).valid).toBe(true);
    input.settings.selectedPredictorIds = [];
    expect(resolveDataQualitySelection(input).valid).toBe(false);
  });
  it('excludes missing and foreign records and requires an available source', () => {
    const input = fixture();
    input.settings = { ...input.settings, selectedMode: 'manual', selectedMeterIds: ['meter'], selectedPredictorIds: ['predictor-0', 'deleted'] };
    input.meters[0].facilityId = 'foreign';
    input.predictors[0].accountId = 'foreign';
    expect(resolveDataQualitySelection(input)).toMatchObject({ valid: false, meters: [], predictors: [] });
    input.settings.selectedMode = 'analysis';
    input.facilityAnalyses[0].facilityId = 'foreign';
    expect(resolveDataQualitySelection(input)).toMatchObject({ valid: false, analysis: undefined });
  });
  it('requires an available analysis and ignores deleted production predictors while meters remain', () => {
    const input = fixture();
    input.settings.selectedAnalysisItemId = undefined;
    expect(resolveDataQualitySelection(input).valid).toBe(false);
    input.settings.selectedAnalysisItemId = 'facility-analysis';
    input.predictors = [];
    expect(resolveDataQualitySelection(input)).toMatchObject({ valid: true, predictors: [] });
    input.meters = [];
    expect(resolveDataQualitySelection(input).valid).toBe(false);
  });
  it('ignores unavailable manual references without changing saved GUID arrays', () => {
    const input = fixture();
    input.settings = { ...input.settings, selectedMode: 'manual', selectedMeterIds: ['deleted-meter', 'meter'],
      selectedPredictorIds: ['deleted-predictor', 'predictor-1'] };
    const before = structuredClone(input.settings);
    const result = resolveDataQualitySelection(input);
    expect(result.valid).toBe(true);
    expect(result.meters.map(meter => meter.guid)).toEqual(['meter']);
    expect(result.predictors.map(predictor => predictor.guid)).toEqual(['predictor-1']);
    expect(input.settings).toEqual(before);
  });
});

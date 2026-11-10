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
    expect(resolveDataQualitySelection(input)).toMatchObject({ valid: true, analysis: undefined, missingMeterIds: [], missingPredictorIds: [] });
    expect(resolveDataQualitySelection(input).meters).toHaveLength(1);
    input.settings.selectedMeterIds = [];
    expect(resolveDataQualitySelection(input).valid).toBe(true);
    input.settings.selectedPredictorIds = [];
    expect(resolveDataQualitySelection(input).valid).toBe(false);
  });
  it('identifies missing and foreign records rather than silently dropping selections', () => {
    const input = fixture();
    input.settings = { ...input.settings, selectedMode: 'manual', selectedMeterIds: ['meter'], selectedPredictorIds: ['predictor-0', 'deleted'] };
    input.meters[0].facilityId = 'foreign';
    input.predictors[0].accountId = 'foreign';
    expect(resolveDataQualitySelection(input)).toMatchObject({ valid: false, meters: [], predictors: [],
      missingMeterIds: ['meter'], missingPredictorIds: ['predictor-0', 'deleted'] });
    input.settings.selectedMode = 'analysis';
    input.facilityAnalyses[0].facilityId = 'foreign';
    expect(resolveDataQualitySelection(input)).toMatchObject({ valid: false, analysis: undefined });
  });
  it('requires a selection, and detects unavailable production predictor references in analysis mode', () => {
    const input = fixture();
    input.settings.selectedAnalysisItemId = undefined;
    expect(resolveDataQualitySelection(input).valid).toBe(false);
    input.settings.selectedAnalysisItemId = 'facility-analysis';
    input.predictors = [];
    expect(resolveDataQualitySelection(input)).toMatchObject({ valid: false, missingPredictorIds: ['predictor-0', 'predictor-1'] });
  });
});

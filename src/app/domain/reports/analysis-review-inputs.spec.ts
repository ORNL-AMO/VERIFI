import { ANALYSIS_DATA_CHECKS_VERSION } from '@data/models/analysis-review';
import { analysisReportContent, analysisReviewContent, analysisReviewIsCurrent } from './analysis-review-inputs';
import { buildAnalysisReportInputs } from './analysis-report-inputs';
import { analysisReportFixture, regressionAnalysisReportFixture } from './testing/analysis-report-fixtures';
import { calculateBetterPlantsReport } from './better-plants-report-calculation';
import { buildUserDefinedRegressionModel } from '@shared/shared-analysis/calculations/regression-models-calculation';

describe('analysis review freshness', () => {
  it('invalidates review and report content when predictor GUID references swap without changing the predictor collection', () => {
    const inputs = buildAnalysisReportInputs(regressionAnalysisReportFixture(), 'account-analysis');
    const review = analysisReviewContent(inputs, 2023);
    const report = analysisReportContent(inputs, [2023]);
    const summary = calculateBetterPlantsReport(inputs, [2023])[0];
    const [first, second] = inputs.facilityAnalyses[0].groups[0].predictorVariables;
    [first.id, second.id] = [second.id, first.id];
    expect(calculateBetterPlantsReport(inputs, [2023])[0].adjustedBaselinePrimaryEnergy).not.toBe(summary.adjustedBaselinePrimaryEnergy);
    expect(analysisReviewContent(inputs, 2023)).not.toBe(review);
    expect(analysisReportContent(inputs, [2023])).not.toBe(report);
  });
  it('retains predictor GUID references inside the selected saved model', () => {
    const inputs = buildAnalysisReportInputs(regressionAnalysisReportFixture(), 'account-analysis');
    const group = inputs.facilityAnalyses[0].groups[0];
    const model = buildUserDefinedRegressionModel(group, inputs.facilities[0], inputs.facilityAnalyses[0], 2023, inputs.predictorData);
    group.isGeneratedModel = true; group.selectedModelId = model.modelId = 'selected'; group.models = [structuredClone(model)];
    const original = analysisReviewContent(inputs, 2023);
    const [first, second] = group.models[0].predictorVariables;
    [first.id, second.id] = [second.id, first.id];
    expect(analysisReviewContent(inputs, 2023)).not.toBe(original);
  });
  it('ignores names, local IDs, timestamps and receipt metadata but detects changed reading values', () => {
    const inputs = buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis');
    const original = analysisReviewContent(inputs, 2023);
    inputs.analysis.name = 'Renamed'; inputs.account.contactName = 'New contact';
    inputs.facilityAnalyses[0].id = 300; inputs.facilityAnalyses[0].modifiedDate = new Date();
    inputs.facilityAnalyses[0].dataCheckReviews = [{ checksVersion: 1, reportYear: 2023, inputFingerprint: 'receipt', reviewedAt: '2026-01-01' }];
    expect(analysisReviewContent(inputs, 2023)).toBe(original);
    inputs.meterData[0].totalEnergyUse += 1;
    expect(analysisReviewContent(inputs, 2023)).not.toBe(original);
  });
  it('canonicalizes collection order without losing model coefficient order', () => {
    const inputs = buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis');
    const original = analysisReviewContent(inputs, 2023);
    const reordered = { ...inputs, meterData: [...inputs.meterData].reverse() };
    expect(analysisReviewContent(reordered, 2023)).toBe(original);
    inputs.facilityAnalyses[0].groups[0].analysisType = 'regression';
    inputs.facilityAnalyses[0].groups[0].selectedModelId = 'selected';
    inputs.facilityAnalyses[0].groups[0].models = [{ coef: [1, 2], modelId: 'selected' } as never];
    const first = analysisReviewContent(inputs, 2023);
    inputs.facilityAnalyses[0].groups[0].models[0].coef.reverse();
    expect(analysisReviewContent(inputs, 2023)).not.toBe(first);
  });
  it('requires the same year, checks version and fingerprint, with a valid confirmation time', () => {
    const reviews = [{ checksVersion: ANALYSIS_DATA_CHECKS_VERSION, reportYear: 2023, inputFingerprint: 'current', reviewedAt: '2026-01-01T00:00:00Z' }];
    expect(analysisReviewIsCurrent(undefined, 2023, 'current')).toBe(false);
    expect(analysisReviewIsCurrent(reviews, 2023, 'current')).toBe(true);
    expect(analysisReviewIsCurrent(reviews, 2024, 'current')).toBe(false);
    expect(analysisReviewIsCurrent(reviews, 2023, 'changed')).toBe(false);
    expect(analysisReviewIsCurrent([{ ...reviews[0], checksVersion: 0 }], 2023, 'current')).toBe(false);
  });
});

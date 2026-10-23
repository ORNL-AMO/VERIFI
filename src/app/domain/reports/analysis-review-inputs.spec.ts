import { ANALYSIS_DATA_CHECKS_VERSION } from '@data/models/analysis-review';
import { analysisReviewContent, analysisReviewIsCurrent } from './analysis-review-inputs';
import { buildAnalysisReportInputs } from './analysis-report-inputs';
import { analysisReportFixture } from './testing/analysis-report-fixtures';

describe('analysis review freshness', () => {
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

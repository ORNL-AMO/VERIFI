import { ANALYSIS_DATA_CHECKS_VERSION, AnalysisDataCheckReview } from '@data/models/analysis-review';
import { AnalysisReportInputs } from './analysis-report-inputs';

/** Canonical content, also compared synchronously inside the acknowledgment transaction. */
export function analysisReviewContent(inputs: AnalysisReportInputs, reportYear: number): string {
  const analysis = inputs.analysis;
  return JSON.stringify(canonical({
    checksVersion: ANALYSIS_DATA_CHECKS_VERSION, owner: inputs.owner, reportYear,
    account: fiscalContext(inputs.account),
    analysis: { baselineYear: analysis.baselineYear, analysisCategory: analysis.analysisCategory,
      energyIsSource: analysis.energyIsSource, energyUnit: analysis.energyUnit, waterUnit: analysis.waterUnit,
      hasBanking: analysis.hasBanking, facilityAnalysisItems: [...analysis.facilityAnalysisItems].sort((a, b) => a.facilityId.localeCompare(b.facilityId)) },
    facilities: byGuid(inputs.facilities).map(facility => ({ ...fiscalContext(facility), guid: facility.guid,
      isNewFacility: facility.isNewFacility })),
    facilityAnalyses: byGuid(inputs.facilityAnalyses), meters: byGuid(inputs.meters), meterData: byGuid(inputs.meterData),
    predictors: byGuid(inputs.predictors), predictorData: byGuid(inputs.predictorData)
  }));
}

export function analysisReviewIsCurrent(reviews: readonly AnalysisDataCheckReview[] | undefined, reportYear: number, fingerprint: string): boolean {
  return !!reviews?.some(review => review.checksVersion === ANALYSIS_DATA_CHECKS_VERSION && review.reportYear === reportYear
    && review.inputFingerprint === fingerprint && Number.isFinite(Date.parse(review.reviewedAt)));
}

function fiscalContext(value: AnalysisReportInputs['account'] | AnalysisReportInputs['facilities'][number]) {
  return { fiscalYear: value.fiscalYear, fiscalYearMonth: value.fiscalYearMonth, fiscalYearCalendarEnd: value.fiscalYearCalendarEnd,
    energyUnit: value.energyUnit, energyIsSource: value.energyIsSource, volumeLiquidUnit: value.volumeLiquidUnit,
    assessmentReportVersion: 'assessmentReportVersion' in value ? value.assessmentReportVersion : undefined };
}
const METADATA = new Set(['id', 'name', 'createdDate', 'modifiedDate', 'checked', 'isAnalysisVisited', 'dataCheckedDate',
  'dataCheckReviews', 'displayEnergyUnit', 'displayEnergyIsSource', 'notes', 'visible', 'sidebarOpen']);
function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  // Only GUID collections are sorted above. Coefficients, predictors and adjustments retain their order.
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !METADATA.has(key)).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => [key, canonical(nested)]));
  return value;
}
function byGuid<T extends { readonly guid: string }>(items: readonly T[]): T[] { return [...items].sort((a, b) => a.guid.localeCompare(b.guid)); }

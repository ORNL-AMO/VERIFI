import { ANALYSIS_DATA_CHECKS_VERSION, AnalysisDataCheckReview } from '@data/models/analysis-review';
import { AnalysisReportInputs } from './analysis-report-inputs';
import { getSelectedRegressionModel } from '@shared/shared-analysis/calculations/regression-model-recovery';

/** Canonical content, also compared synchronously inside the acknowledgment transaction. */
export function analysisReviewContent(inputs: AnalysisReportInputs, reportYear: number): string {
  const analysis = inputs.analysis;
  const groupIds = new Set(inputs.facilityAnalyses.flatMap(item => item.groups)
    .filter(group => group.analysisType !== 'skip' && group.analysisType !== 'skipAnalysis').map(group => group.idbGroupId));
  const meters = inputs.meters.filter(meter => groupIds.has(meter.groupId));
  const meterIds = new Set(meters.map(meter => meter.guid));
  return JSON.stringify(canonical({
    checksVersion: ANALYSIS_DATA_CHECKS_VERSION, owner: inputs.owner, reportYear,
    account: fiscalContext(inputs.account),
    analysis: { baselineYear: analysis.baselineYear, analysisCategory: analysis.analysisCategory,
      energyIsSource: analysis.energyIsSource, energyUnit: analysis.energyUnit, waterUnit: analysis.waterUnit,
      hasBanking: analysis.hasBanking, facilityAnalysisItems: [...analysis.facilityAnalysisItems].sort((a, b) => a.facilityId.localeCompare(b.facilityId)) },
    facilities: byGuid(inputs.facilities).map(facility => ({ ...fiscalContext(facility), guid: facility.guid,
      isNewFacility: facility.isNewFacility })),
    facilityAnalyses: byGuid(inputs.facilityAnalyses).map(item => ({ ...item, groups: item.groups.map(group => ({ ...group,
      models: group.analysisType === 'regression' ? [getSelectedRegressionModel(group)].filter(Boolean) : undefined })) })),
    meters: byGuid(meters), meterData: byGuid(inputs.meterData.filter(reading => meterIds.has(reading.meterId))),
    predictors: byGuid(inputs.predictors), predictorData: byGuid(inputs.predictorData)
  }));
}

/** Report values also use additional intake meters and facility manufacturing classification. */
export function analysisReportContent(inputs: AnalysisReportInputs, years: readonly number[]): string {
  return JSON.stringify(canonical({
    periods: years.map(year => analysisReviewContent(inputs, year)),
    meters: byGuid(inputs.meters), meterData: byGuid(inputs.meterData),
    facilities: byGuid(inputs.facilities).map(facility => ({ guid: facility.guid, classification: facility.classification }))
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

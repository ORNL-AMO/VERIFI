/** A review belongs to an analysis, independently of the report that requested it. */
export type AnalysisReviewOwner =
  | { readonly scope: 'account'; readonly analysisGuid: string }
  | { readonly scope: 'facility'; readonly facilityGuid: string; readonly analysisGuid: string };

export const ANALYSIS_DATA_CHECKS_VERSION = 1;

export interface AnalysisDataCheckReview {
  readonly checksVersion: number;
  readonly reportYear: number;
  readonly inputFingerprint: string;
  readonly reviewedAt: string;
}

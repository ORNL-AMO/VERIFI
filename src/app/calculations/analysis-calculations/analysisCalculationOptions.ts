/**
 * Transient options that control an analysis calculation.
 * These values must not be persisted on an analysis database item.
 */
export interface AnalysisCalculationOptions {
    /**
     * Use this report year instead of deriving the latest complete year from data.
     */
    reportYear?: number;
}

import { AnalysisReportSettings, getAnalysisReportSettings } from '@data/models/idbModels/facilityReport';

/** Defaults for new reports and explicit resets in the unified workspace. */
export function getAnalysisReportDefaults(): AnalysisReportSettings {
  const settings = getAnalysisReportSettings();
  Object.assign(settings.analysisTableColumns, {
    baselineAdjustmentForNormalization: false,
    baselineAdjustmentForOther: false,
    baselineAdjustment: false
  });
  return settings;
}

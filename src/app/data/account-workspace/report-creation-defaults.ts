import { AnalysisReportSettings, getAnalysisReportSettings } from '@data/models/idbModels/facilityReport';

/** Defaults shared by inventory creation and analysis-origin report creation. */
export function getAnalysisReportDefaults(): AnalysisReportSettings {
  const settings = getAnalysisReportSettings();
  settings.facilityGroupContributions = true;
  Object.assign(settings.analysisTableColumns, {
    baselineAdjustmentForNormalization: false,
    baselineAdjustmentForOther: false,
    baselineAdjustment: false
  });
  return settings;
}

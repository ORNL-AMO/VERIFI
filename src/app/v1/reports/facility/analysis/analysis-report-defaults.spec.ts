import { getAnalysisReportSettings } from '@data/models/idbModels/facilityReport';
import { getAnalysisReportDefaults } from './analysis-report-defaults';
import { settingsDraft, settingsForm } from './analysis-report-settings';

describe('facility Analysis report column defaults', () => {
  const expected = {
    actualEnergy: true, modeledEnergy: true, adjusted: true,
    baselineAdjustmentForNormalization: false, baselineAdjustmentForOther: false, baselineAdjustment: false
  };
  it('starts fresh settings and forms with only the three consumption-use columns selected', () => {
    expect(getAnalysisReportDefaults().analysisTableColumns).toMatchObject(expected);
    expect(settingsDraft().analysisTableColumns).toMatchObject(expected);
    expect(settingsForm().getRawValue().analysisTableColumns).toMatchObject(expected);
  });
  it('preserves existing selections and legacy defaults without changing the saved record', () => {
    const saved = getAnalysisReportSettings(), before = structuredClone(saved);
    getAnalysisReportDefaults();
    expect(settingsDraft(saved).analysisTableColumns).toEqual(saved.analysisTableColumns);
    expect(saved).toEqual(before);
    expect(getAnalysisReportSettings().analysisTableColumns).toMatchObject({
      baselineAdjustmentForNormalization: true, baselineAdjustmentForOther: true, baselineAdjustment: true
    });
  });
});

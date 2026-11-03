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
  it('enables contributions only for explicitly created v1 settings and new forms', () => {
    expect(getAnalysisReportSettings()).toMatchObject({
      facilityGroupContributions: false, facilityGroupContributionsTable: true, facilityGroupContributionsGraphs: true
    });
    expect(getAnalysisReportDefaults()).toMatchObject({
      facilityGroupContributions: true, facilityGroupContributionsTable: true, facilityGroupContributionsGraphs: true
    });
    expect(settingsForm().getRawValue()).toMatchObject({
      facilityGroupContributions: true, facilityGroupContributionsTable: true, facilityGroupContributionsGraphs: true
    });
    expect(settingsDraft().facilityGroupContributions).toBe(false);
    expect(settingsDraft(getAnalysisReportDefaults()).facilityGroupContributions).toBe(true);
  });
  it('normalizes missing contribution settings without mutating or enabling existing reports', () => {
    const saved = getAnalysisReportSettings();
    delete saved.facilityGroupContributions;
    delete saved.facilityGroupContributionsTable;
    delete saved.facilityGroupContributionsGraphs;
    const before = structuredClone(saved);
    expect(settingsDraft(saved)).toMatchObject({
      facilityGroupContributions: false, facilityGroupContributionsTable: true, facilityGroupContributionsGraphs: true
    });
    expect(saved).toEqual(before);
    expect(settingsDraft({ ...saved, facilityGroupContributions: true,
      facilityGroupContributionsTable: false, facilityGroupContributionsGraphs: false })).toMatchObject({
      facilityGroupContributions: true, facilityGroupContributionsTable: false, facilityGroupContributionsGraphs: false
    });
  });
});

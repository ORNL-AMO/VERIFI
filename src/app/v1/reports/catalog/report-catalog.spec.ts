import { ACCOUNT_REPORT_TYPES, FACILITY_REPORT_TYPES, reportDefinition, reportTypeChoices, reportTypePresentation } from './report-catalog';

describe('report catalog', () => {
  it('enables account and facility Modeling without a review stage', () => {
    expect(reportDefinition('facility', 'modeling')).toMatchObject({ contentImplemented: true, hasDataChecks: false, supportsAnalysisReturn: true });
    expect(reportDefinition('account', 'analysis')).toMatchObject({ label: 'Modeling', icon: 'modelingReport', contentImplemented: true, hasDataChecks: false });
  });
  it('implements facility emission factors independently of the pending account report', () => {
    expect(reportDefinition('facility', 'emissionFactors')).toMatchObject({ contentImplemented: true, hasDataChecks: false,
      supportsAnalysisReturn: false, requiresOtherImpacts: true });
    expect(reportDefinition('account', 'accountEmissionFactors')?.contentImplemented).toBe(false);
  });
  it('supports facility Data Quality analysis inspection without adding a data checks stage', () => {
    expect(reportDefinition('facility', 'dataQuality')).toMatchObject({
      contentImplemented: true, hasDataChecks: false, supportsAnalysisReturn: true, requiresOtherImpacts: false
    });
  });
  it('keeps account and facility Analysis capabilities separate', () => {
    expect(reportDefinition('account', 'analysis')).toMatchObject({
      icon: 'modelingReport', hasDataChecks: false, contentImplemented: true, supportsAnalysisReturn: true
    });
    expect(reportDefinition('facility', 'analysis')).toMatchObject({
      icon: 'facilityAnalysisReport', hasDataChecks: true, contentImplemented: true, supportsAnalysisReturn: true
    });
  });

  it.each(['unknown', '', '__proto__', 'toString'])('leaves unknown saved type %s unsupported in either scope', type => {
    expect(reportDefinition('account', type)).toBeUndefined();
    expect(reportDefinition('facility', type)).toBeUndefined();
    expect(reportTypePresentation('account', type, false)).toEqual({ label: 'Report', formatLabel: undefined });
    expect(reportTypePresentation('facility', type, true)).toEqual({ label: 'Report', formatLabel: undefined });
  });

  it('preserves the established scope order and all existing type choices', () => {
    expect(ACCOUNT_REPORT_TYPES.map(option => option.value)).toEqual([
      'betterPlants', 'dataOverview', 'performance', 'betterClimate', 'analysis', 'accountEmissionFactors', 'accountSavings'
    ]);
    expect(FACILITY_REPORT_TYPES.map(option => option.value)).toEqual([
      'analysis', 'overview', 'emissionFactors', 'savings', 'modeling', 'costSavings', 'dataQuality'
    ]);
    const choices = reportTypeChoices(false, true);
    expect(choices).toHaveLength(14);
    expect(new Set(choices.map(choice => choice.value)).size).toBe(14);
  });
});

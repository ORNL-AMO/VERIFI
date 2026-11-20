import { getModelingReportSettings } from '@data/models/idbModels/facilityReport';
import { calculateAnalysisDataChecks } from './analysis-data-checks';
import { buildFacilityAnalysisReportInputs } from './analysis-report-inputs';
import { analysisReportFixture, regressionAnalysisReportFixture } from './testing/analysis-report-fixtures';
import { buildModelingReport, modelingReportContent, prepareModelingReportInputs } from './modeling-report';

describe('modeling report projection', () => {
  const names = { facilities: { facility: 'Renamed plant' }, groups: { group: 'Main group' } };
  it('prepares current predictor labels without mutating inputs and includes diagnostic names in freshness', () => {
    const snapshot = regressionAnalysisReportFixture();
    const inputs = buildFacilityAnalysisReportInputs(snapshot, 'facility', 'facility-analysis');
    const before = structuredClone(inputs), previous = modelingReportContent(inputs, 2023);
    inputs.predictors[0].name = 'Renamed production';
    const prepared = prepareModelingReportInputs(inputs);
    expect(prepared.facilityAnalyses[0].groups[0].predictorVariables[0].name).toBe('Renamed production');
    expect(inputs.facilityAnalyses).toEqual(before.facilityAnalyses);
    expect(modelingReportContent(prepared, 2023)).not.toBe(previous);
  });
  it.each(['energyIntensity', 'modifiedEnergyIntensity', 'absoluteEnergyConsumption'] as const)('includes %s and excludes skipped groups without changing source data', method => {
    const snapshot = analysisReportFixture();
    const analysis = snapshot.facilityAnalyses[0];
    analysis.groups[0].analysisType = method;
    analysis.groups.push({ ...analysis.groups[0], idbGroupId: 'skip', analysisType: 'skipAnalysis' });
    const before = structuredClone(snapshot);
    const checks = calculateAnalysisDataChecks(buildFacilityAnalysisReportInputs(snapshot, 'facility', analysis.guid), 2022);
    const view = buildModelingReport(checks, getModelingReportSettings(), names);
    expect(view.methods.map(item => item.method)).toEqual([method]);
    expect(view.groups).toHaveLength(1); expect(view.groups[0].facilityName).toBe('Renamed plant');
    expect(view.regression).toEqual([]); expect(snapshot).toEqual(before);
  });
  it('preserves selected-year validation and user-defined model diagnostics from the authoritative calculator', () => {
    const snapshot = regressionAnalysisReportFixture();
    const checks = calculateAnalysisDataChecks(buildFacilityAnalysisReportInputs(snapshot, 'facility', 'facility-analysis'), 2023);
    const view = buildModelingReport(checks, getModelingReportSettings(), names);
    expect(view.regression[0].model).toEqual(checks.groups[0].model);
    expect(view.reportYear).toBe(2023); expect(view.regression[0].model?.isUserDefinedModel).toBe(true);
    expect(view.issues.find(item => item.severity === 'moderate')!.rows.map(item => item.note)).toEqual([...checks.groups[0].moderate]);
  });
  it('keeps missing models and separate facility identities visible in a multi-facility report', () => {
    const snapshot = analysisReportFixture(); const analysis = snapshot.facilityAnalyses[0];
    Object.assign(analysis.groups[0], { analysisType: 'regression', isGeneratedModel: true, selectedModelId: undefined });
    const checks = calculateAnalysisDataChecks(buildFacilityAnalysisReportInputs(snapshot, 'facility', analysis.guid), 2023);
    const original = checks.groups[0];
    const view = buildModelingReport({ ...checks, groups: [original, { ...original, facilityGuid: 'other', facilityName: 'Other plant' }] },
      getModelingReportSettings(), names);
    expect(new Set(view.groups.map(item => item.key)).size).toBe(2);
    expect(view.regression).toHaveLength(2); expect(view.issues[0].rows).toHaveLength(2);
    expect(view.regression[0].model).toBeUndefined();
  });
  it('retains explicitly disabled sections and handles an empty analysis', () => {
    const view = buildModelingReport({ reportYear: 2023, groups: [], hasBlockingErrors: true }, {
      includeIssuesSummary: false, includeExecutiveSummary: false, includeDataValidationTables: false
    }, names);
    expect(view.hasContent).toBe(false); expect(view.groups).toEqual([]);
  });
});

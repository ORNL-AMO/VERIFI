import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { FacilityReportType } from '@data/models/idbModels/facilityReport';
import { StatusItem } from '@app/v1/status/status.models';
import { buildFacilityReportPresentation } from './facility-report.models';
import { reportFixture } from './testing/report-test-fixtures';

describe('facility report presentation', () => {
  const linkedAnalysis = { guid: 'analysis-a', facilityId: 'facility-a', name: 'Steam model' } as IdbAnalysisItem;
  const analysisFact = { label: 'Analysis', value: 'Steam model' };

  it.each([
    { type: 'analysis', label: 'Analysis', period: '2024', usesAnalysis: true },
    { type: 'overview', label: 'Data Overview', period: 'Jan 2023 – Dec 2024', usesAnalysis: false },
    { type: 'emissionFactors', label: 'Emission Factors', period: '2023 – 2024', usesAnalysis: false },
    { type: 'savings', label: 'Savings', period: 'Through Dec 2024', usesAnalysis: true },
    { type: 'modeling', label: 'Modeling', period: '2024', usesAnalysis: true },
    { type: 'costSavings', label: 'Cost Savings', period: 'Through Dec 2024', usesAnalysis: true },
    { type: 'dataQuality', label: 'Data Quality', period: undefined, usesAnalysis: true }
  ] as const)('presents saved $label facts independently of pending report content', ({ type, label, period, usesAnalysis }) => {
    const report = reportFixture({ facilityReportType: type, analysisItemId: usesAnalysis ? 'analysis-a' : undefined });
    report.analysisReportSettings.reportYear = 2024;
    report.dataOverviewReportSettings = { ...report.dataOverviewReportSettings, startMonth: 0, startYear: 2023, endMonth: 11, endYear: 2024 };
    report.emissionFactorsReportSettings = { ...report.emissionFactorsReportSettings, startYear: 2023, endYear: 2024 };
    report.savingsReportSettings = { ...report.savingsReportSettings, endMonth: 11, endYear: 2024 };
    report.modelingReportSettings.reportYear = 2024;
    report.costSavingsReportSettings = { ...report.costSavingsReportSettings, endMonth: 11, endYear: 2024 };
    report.dataQualityReportSettings.selectedAnalysisItemId = 'analysis-a';
    const original = structuredClone(report);

    expect(buildFacilityReportPresentation(report, [linkedAnalysis], [], 'ready')).toEqual({
      typeLabel: label,
      status: 'ready',
      facts: [
        ...(period ? [{ label: 'Reporting period', value: period }] : []),
        ...(usesAnalysis ? [analysisFact] : [])
      ]
    });
    expect(report).toEqual(original);
  });

  it('shows missing legacy periods without adding settings to the saved record', () => {
    const report = reportFixture({ dataOverviewReportSettings: undefined, facilityReportType: 'overview' });
    expect(buildFacilityReportPresentation(report, [], [], 'ready').facts)
      .toEqual([{ label: 'Reporting period', value: 'Not set – Not set' }]);
    expect(report.dataOverviewReportSettings).toBeUndefined();
  });

  it.each([
    { guid: undefined, analyses: [], value: 'Not selected' },
    { guid: 'missing-analysis', analyses: [linkedAnalysis], value: 'Linked analysis unavailable' },
    { guid: 'analysis-a', analyses: [{ ...linkedAnalysis, facilityId: 'other-facility' }], value: 'Linked analysis unavailable' },
    { guid: 'analysis-a', analyses: [linkedAnalysis], value: 'Steam model' }
  ])('distinguishes an unavailable or unselected analysis from its saved name: $value', ({ guid, analyses, value }) => {
    const report = reportFixture({ analysisItemId: guid, analysisReportSettings: undefined });
    expect(buildFacilityReportPresentation(report, analyses, [], 'ready').facts).toEqual([
      { label: 'Reporting period', value: 'Not set' }, { label: 'Analysis', value }
    ]);
  });

  it('uses the saved Data Quality analysis selection only in analysis mode', () => {
    const report = reportFixture({ facilityReportType: 'dataQuality', analysisItemId: 'stale-general-selection' });
    report.dataQualityReportSettings.selectedAnalysisItemId = linkedAnalysis.guid;
    expect(buildFacilityReportPresentation(report, [linkedAnalysis], [], 'ready').facts).toEqual([analysisFact]);
    report.dataQualityReportSettings.selectedMode = 'manual';
    expect(buildFacilityReportPresentation(report, [linkedAnalysis], [], 'ready').facts).toEqual([]);
    report.dataQualityReportSettings = undefined;
    expect(buildFacilityReportPresentation(report, [linkedAnalysis], [], 'ready').facts).toEqual([]);
  });

  it('keeps failed and unfinished validation distinct from ready setup', () => {
    const report = reportFixture();
    expect(buildFacilityReportPresentation(report, [], [], 'error').status).toBe('unavailable');
    expect(buildFacilityReportPresentation(report, [], [], 'evaluating').status).toBe('checking');
    expect(buildFacilityReportPresentation(report, [], [], 'idle').status).toBe('checking');
  });

  it('uses only the report’s owned findings and gives errors precedence over warnings', () => {
    const report = reportFixture();
    const warning = { id: 'warning', severity: 'warning', entity: {
      kind: 'facility-report', guid: report.guid, facilityGuid: report.facilityId, accountGuid: report.accountId
    } } as StatusItem;
    const foreignFindings = [
      { ...warning, severity: 'error', entity: { ...warning.entity, accountGuid: 'other-account' } },
      { ...warning, severity: 'error', entity: { ...warning.entity, facilityGuid: 'other-facility' } },
      { ...warning, severity: 'error', entity: { ...warning.entity, guid: 'other-report' } }
    ] as StatusItem[];
    expect(buildFacilityReportPresentation(report, [], foreignFindings, 'ready').status).toBe('ready');
    expect(buildFacilityReportPresentation(report, [], [...foreignFindings, warning], 'ready').status).toBe('warning');
    expect(buildFacilityReportPresentation(report, [], [warning, { ...warning, severity: 'error' }], 'ready').status).toBe('error');
  });

  it('keeps unknown report types visible with an explicit incomplete-setup fallback', () => {
    const report = reportFixture({ facilityReportType: 'unknown' as FacilityReportType });
    expect(buildFacilityReportPresentation(report, [], [], 'ready')).toEqual({
      typeLabel: 'Unknown report type', status: 'error', facts: []
    });
    expect(buildFacilityReportPresentation(report, [], [], 'error').status).toBe('unavailable');
  });
});

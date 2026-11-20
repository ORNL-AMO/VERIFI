import { AnalysisResultVisualizationSource } from '@domain/visualizations/visualization-definition';
import { analysisUsageFixture } from '@data/account-workspace/testing/analysis-usage-fixtures';
import { getNewIdbAccountReport } from '@data/models/idbModels/accountReport';
import { getNewIdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { analysisDefinition } from '@domain/visualizations/testing/analysis-fixtures';
import { buildAnalysisUsageView } from './analysis-usage.view';

describe('Analysis Used By cards', () => {
  it('links consumers by ownership and GUID while keeping the upstream banking source separate', () => {
    const f = analysisUsageFixture();
    const accountAnalysis = { ...f.accountAnalysis, facilityAnalysisItems: [{ facilityId: f.facility.guid, analysisItemId: f.analysis.guid }] };
    const report = { ...getNewIdbFacilityReport(f.facility.guid, f.account.guid, 'analysis', []), guid: 'report', analysisItemId: f.analysis.guid };
    const consumer = { ...f.analysis, id: 2, guid: 'consumer', name: 'Later baseline', bankedAnalysisItemId: f.analysis.guid };
    const upstream = { ...f.analysis, id: 3, guid: 'upstream' };
    const snapshot = { ...f.snapshot, accountAnalyses: [accountAnalysis], facilityReports: [report, report,
      { ...report, guid: 'foreign', facilityId: f.other.guid }], facilityAnalyses: [{ ...f.analysis, bankedAnalysisItemId: upstream.guid }, consumer, upstream] };
    const view = buildAnalysisUsageView(snapshot, f.source);
    expect(view.consumers.map(card => card.key)).toEqual(['account-analysis:account-analysis-a', 'facility-report:report', 'facility-analysis:consumer']);
    expect(view.consumers[1]).toMatchObject({ icon: 'facilityAnalysisReport', route: ['/v1', 'workspace', 'facility', f.facility.guid, 'reports', 'workbench', 'report', 'setup'] });
    expect(view.bankingSource?.key).toBe('facility-analysis:upstream');
  });

  it('uses Data Quality mode instead of stale mirrored fields', () => {
    const f = analysisUsageFixture();
    const report = getNewIdbFacilityReport(f.facility.guid, f.account.guid, 'dataQuality', []);
    report.analysisItemId = f.analysis.guid;
    report.dataQualityReportSettings.selectedMode = 'manual';
    expect(buildAnalysisUsageView({ ...f.snapshot, facilityReports: [report] }, f.source).consumers).toEqual([]);
    report.analysisItemId = undefined;
    report.dataQualityReportSettings.selectedMode = 'analysis';
    report.dataQualityReportSettings.selectedAnalysisItemId = f.analysis.guid;
    expect(buildAnalysisUsageView({ ...f.snapshot, facilityReports: [report] }, f.source).consumers).toHaveLength(1);
  });

  it('unwraps single-facility account-format reports without displaying internal pairs or repairing them', () => {
    const f = analysisUsageFixture();
    const pair = { ...f.accountAnalysis, facilityAnalysisItems: [{ facilityId: f.facility.guid, analysisItemId: f.analysis.guid }] };
    const report = getNewIdbAccountReport(f.account, [f.facility], []);
    report.reportType = 'betterPlants'; report.betterPlantsReportSetup.analysisItemId = pair.guid;
    const snapshot = { ...f.snapshot, account: { ...f.account, isSingleFacilityCompany: true }, facilities: [f.facility], accountAnalyses: [pair], accountReports: [report] };
    const before = structuredClone(snapshot);
    expect(buildAnalysisUsageView(snapshot, f.source).consumers.map(item => item.key)).toEqual([`account-report:${report.guid}`]);
    expect(snapshot).toEqual(before);
  });

  it('deduplicates explicit visualization sources and excludes unverified transferred payloads', () => {
    const f = analysisUsageFixture(), definition = analysisDefinition('actual', 'group-a');
    const first = definition.sources[0] as AnalysisResultVisualizationSource;
    const record = getNewIdbSavedVisualization({ ...definition, sources: [first, { ...first, id: 'second', measure: 'calculated' }] });
    const blocked = { ...record, guid: 'blocked', preservation: { locked: true, references: [], transfers: [] } };
    const view = buildAnalysisUsageView({ ...f.snapshot, savedVisualizations: [record, blocked] }, f.source);
    expect(view.consumers).toHaveLength(1);
    expect(view.consumers[0]).toMatchObject({ key: `visualization:${record.guid}`, icon: 'chartTimeSeries' });
  });

  it.each(['betterPlants', 'performance', 'analysis', 'accountSavings'] as const)('links the active %s account report selection only', type => {
    const f = analysisUsageFixture(), report = getNewIdbAccountReport(f.account, [...f.snapshot.facilities], []);
    report.reportType = type;
    report.betterPlantsReportSetup.analysisItemId = f.accountAnalysis.guid;
    report.performanceReportSetup.analysisItemId = f.accountAnalysis.guid;
    report.analysisReportSetup.analysisItemId = f.accountAnalysis.guid;
    report.accountSavingsReportSetup.analysisItemId = f.accountAnalysis.guid;
    expect(buildAnalysisUsageView({ ...f.snapshot, accountReports: [report] }, {
      scope: 'account', accountGuid: f.account.guid, analysisGuid: f.accountAnalysis.guid
    }).consumers[0].key).toBe(`account-report:${report.guid}`);
  });
});

import { accountReportSnapshot } from '../testing/account-report-test-fixtures';
import { reportAnalysisOptions, reportAnalysisToken, savedReportAnalysisChoice } from './account-report-workbench.models';

describe('account report analysis choices', () => {
  it('uses scope-qualified identities and selects facility analyses through saved hidden pairs', () => {
    const snapshot = accountReportSnapshot(true), report = snapshot.accountReports[0];
    const choice = savedReportAnalysisChoice(report, snapshot)!;
    expect(choice).toEqual({ scope: 'facility', facilityGuid: 'facility-a', analysisGuid: 'facility-analysis' });
    expect(reportAnalysisOptions(report, snapshot)[0].value).toBe(reportAnalysisToken(choice));
    expect(reportAnalysisToken({ scope: 'account', analysisGuid: 'same' })).not.toBe(reportAnalysisToken({ scope: 'facility', facilityGuid: 'facility-a', analysisGuid: 'same' }));
  });
  it('retains missing, ineligible and non-paired saved references as unavailable options', () => {
    for (const single of [false, true]) {
      const snapshot = accountReportSnapshot(single), report = snapshot.accountReports[0];
      report.analysisReportSetup.analysisItemId = 'missing';
      expect(reportAnalysisOptions(report, snapshot)[0]).toMatchObject({ unavailable: true, value: reportAnalysisToken({ scope: 'account', analysisGuid: 'missing' }) });
      report.analysisReportSetup.analysisItemId = 'account-analysis';
      snapshot.accountAnalyses[0].energyIsSource = false; snapshot.facilityAnalyses[0].energyIsSource = false;
      expect(reportAnalysisOptions(report, snapshot)[0].unavailable).toBe(true);
      expect(report.analysisReportSetup.analysisItemId).toBe('account-analysis');
    }
  });
  it('shows only owned source-energy/water choices without filtering away the saved link', () => {
    const snapshot = accountReportSnapshot();
    snapshot.accountAnalyses = [...snapshot.accountAnalyses,
      { ...snapshot.accountAnalyses[0], id: 31, guid: 'water', name: 'Water', analysisCategory: 'water' },
      { ...snapshot.accountAnalyses[0], id: 32, guid: 'site', energyIsSource: false },
      { ...snapshot.accountAnalyses[0], id: 33, guid: 'wrong-owner', accountId: 'account-b' }];
    expect(reportAnalysisOptions(snapshot.accountReports[0], snapshot).map(option => option.selection.analysisGuid)).toEqual(['account-analysis', 'water']);
  });
});

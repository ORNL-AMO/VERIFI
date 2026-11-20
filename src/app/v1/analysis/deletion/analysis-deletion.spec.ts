import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { analysisDeletionPreview } from './analysis-deletion';

function snapshot(): AccountWorkspaceSnapshot {
  return {
    account: { guid: 'account', name: 'Account', isSingleFacilityCompany: true },
    facilities: [{ guid: 'facility', accountId: 'account', name: 'Plant', selectedEnergyAnalysisId: 'facility-analysis' }],
    facilityAnalyses: [{ guid: 'facility-analysis', facilityId: 'facility', accountId: 'account', name: 'Energy' }],
    accountAnalyses: [
      { guid: 'pair', accountId: 'account', name: 'Pair', facilityAnalysisItems: [{ facilityId: 'facility', analysisItemId: 'facility-analysis' }] },
      { guid: 'portfolio', accountId: 'account', name: 'Portfolio', facilityAnalysisItems: [{ facilityId: 'facility', analysisItemId: 'facility-analysis' }, { facilityId: 'other' }] }
    ],
    facilityReports: [], accountReports: []
  } as unknown as AccountWorkspaceSnapshot;
}

describe('analysis deletion preview', () => {
  it('distinguishes hidden pairs to delete from account selections to clear', () => {
    const preview = analysisDeletionPreview(snapshot(), 'facility', 'facility-analysis')!;
    expect(preview).toMatchObject({ ownerName: 'Plant', clearsActiveSelection: true, pairedAccountAnalysisCount: 1, blockedReason: '' });
    expect(preview.linkedAccountAnalyses.map(item => item.guid)).toEqual(['portfolio']);
  });

  it.each(['analysisReportSetup', 'betterPlantsReportSetup'] as const)('blocks reports referencing a hidden pair through %s', key => {
    const data = snapshot();
    const result = analysisDeletionPreview({ ...data, accountReports: [{ reportType: key == 'analysisReportSetup' ? 'analysis' : 'betterPlants', [key]: { analysisItemId: 'pair' } }] as any }, 'facility', 'facility-analysis');
    expect(result?.blockedReason).toContain('paired account analysis');
  });

  it('uses the current data-quality report mode when checking facility report references', () => {
    const data = snapshot();
    const report = {
      facilityReportType: 'dataQuality', analysisItemId: 'unrelated',
      dataQualityReportSettings: { selectedMode: 'analysis', selectedAnalysisItemId: 'facility-analysis' }
    };
    expect(analysisDeletionPreview({ ...data, facilityReports: [report] as any }, 'facility', 'facility-analysis')?.blockedReason)
      .toContain('linked facility report');
    const dataOnly = { ...report, analysisItemId: 'facility-analysis', dataQualityReportSettings: { ...report.dataQualityReportSettings, selectedMode: 'manual' } };
    expect(analysisDeletionPreview({ ...data, facilityReports: [dataOnly] as any }, 'facility', 'facility-analysis')?.blockedReason).toBe('');
  });

  it('blocks a banking consumer and ignores the target referencing itself', () => {
    const data = snapshot();
    const target = { ...data.facilityAnalyses[0], bankedAnalysisItemId: 'facility-analysis' };
    expect(analysisDeletionPreview({ ...data, facilityAnalyses: [target] }, 'facility', target.guid)?.blockedReason).toBe('');
    expect(analysisDeletionPreview({ ...data, facilityAnalyses: [target, { ...target, guid: 'consumer' }] }, 'facility', target.guid)?.blockedReason).toContain('banking workflow');
  });

  it('does not treat ordinary account selections as hidden pairs outside single-facility mode', () => {
    const data = snapshot();
    expect(analysisDeletionPreview({ ...data, account: { ...data.account, isSingleFacilityCompany: false } }, 'facility', 'facility-analysis'))
      .toMatchObject({ pairedAccountAnalysisCount: 0, linkedAccountAnalyses: data.accountAnalyses });
  });

  it('blocks linked account reports and rejects missing or cross-account targets', () => {
    const data = snapshot();
    expect(analysisDeletionPreview({ ...data, accountReports: [{ reportType: 'analysis', analysisReportSetup: { analysisItemId: 'portfolio' } }] as any }, 'account', 'portfolio')?.blockedReason).toContain('linked account report');
    expect(analysisDeletionPreview(data, 'account', 'missing')).toBeUndefined();
    expect(analysisDeletionPreview({ ...data, facilityAnalyses: [{ ...data.facilityAnalyses[0], accountId: 'other' }] }, 'facility', 'facility-analysis')).toBeUndefined();
  });
});

import { AccountWorkspaceQueryService } from './account-workspace-query.service';
import { AccountWorkspaceSnapshot } from './account-workspace.models';
import { AccountWorkspaceStore } from './account-workspace.store';

describe('AccountWorkspaceQueryService', () => {
  it('returns editable copies without changing workspace entities or export order', () => {
    const store = new AccountWorkspaceStore();
    store.publish(createSnapshot());
    const query = new AccountWorkspaceQueryService(store);

    const meters = query.getMetersForExport();
    meters[0].name = 'Changed copy';

    expect(meters.map(meter => meter.guid)).toEqual(['meter-a', 'meter-b']);
    expect(meters[0].meterNumber).toBe('Electricity_meter-a');
    expect(store.meters()[0].name).toBe('Meter A');
    expect(store.meters()[0].meterNumber).toBeUndefined();
  });

  it('filters meter and predictor records by facility and parent GUID', () => {
    const store = new AccountWorkspaceStore();
    store.publish(createSnapshot());
    const query = new AccountWorkspaceQueryService(store);

    expect(query.getFacilityMeters('facility-a').map(item => item.guid)).toEqual(['meter-a']);
    expect(query.getMeterData('meter-a').map(item => item.guid)).toEqual(['data-a']);
    expect(query.getFacilityPredictors('facility-b').map(item => item.guid)).toEqual(['predictor-b']);
    expect(query.getPredictorData('predictor-b').map(item => item.guid)).toEqual(['predictor-data-b']);
  });

  it('finds active workspace entities by GUID and returns detached nested copies', () => {
    const store = new AccountWorkspaceStore();
    store.publish(createSnapshot());
    const query = new AccountWorkspaceQueryService(store);

    const facility = query.getFacilityByGuid('facility-a');
    const facilityAnalysis = query.getFacilityAnalysisByGuid('analysis-a');
    const accountAnalysis = query.getAccountAnalysisByGuid('account-analysis-a');
    const facilityReport = query.getFacilityReportByGuid('facility-report-a');
    const accountReport = query.getAccountReportByGuid('account-report-a');

    facility.sustainabilityQuestions.energyReductionGoal = false;
    facilityAnalysis.groups[0].analysisType = 'skip';
    accountAnalysis.facilityAnalysisItems[0].analysisItemId = 'changed';
    facilityReport.analysisReportSettings.reportYear = 2030;
    accountReport.name = 'Changed report';

    expect(store.facilities()[0].sustainabilityQuestions.energyReductionGoal).toBe(true);
    expect(store.facilityAnalyses()[0].groups[0].analysisType).toBe('regression');
    expect(store.accountAnalyses()[0].facilityAnalysisItems[0].analysisItemId).toBe('analysis-a');
    expect((store.facilityReports()[0] as any).analysisReportSettings.reportYear).toBe(2024);
    expect(store.accountReports()[0].name).toBe('Account report');
    expect(query.getFacilityByGuid('missing')).toBeUndefined();
    expect(query.getFacilityAnalysisByGuid('missing')).toBeUndefined();
    expect(query.getAccountAnalysisByGuid('missing')).toBeUndefined();
    expect(query.getFacilityReportByGuid('missing')).toBeUndefined();
    expect(query.getAccountReportByGuid('missing')).toBeUndefined();
  });

  it('finds account analyses that reference a facility analysis without exposing workspace state', () => {
    const store = new AccountWorkspaceStore();
    store.publish(createSnapshot());
    const query = new AccountWorkspaceQueryService(store);

    const matches = query.getAccountAnalysesForFacilityAnalysis('analysis-a');
    matches[0].facilityAnalysisItems[0].analysisItemId = 'changed';

    expect(matches.map(item => item.guid)).toEqual(['account-analysis-a']);
    expect(query.getAccountAnalysesForFacilityAnalysis('analysis-b')).toEqual([]);
    expect(store.accountAnalyses()[0].facilityAnalysisItems[0].analysisItemId).toBe('analysis-a');
  });

  it('does not retain entities from a previously active account', () => {
    const store = new AccountWorkspaceStore();
    store.publish(createSnapshot());
    const query = new AccountWorkspaceQueryService(store);

    store.publish({
      account: { id: 2, guid: 'account-b' } as any,
      facilities: [{ id: 3, guid: 'facility-c', accountId: 'account-b' }] as any,
      meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
      facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [],
      customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
    });

    expect(query.getFacilityByGuid('facility-a')).toBeUndefined();
    expect(query.getFacilityAnalysisByGuid('analysis-a')).toBeUndefined();
    expect(query.getFacilityByGuid('facility-c')?.accountId).toBe('account-b');
  });
});

function createSnapshot(): AccountWorkspaceSnapshot {
  return {
    account: { id: 1, guid: 'account-a' } as any,
    facilities: [
      {
        id: 1,
        guid: 'facility-a',
        accountId: 'account-a',
        sustainabilityQuestions: { energyReductionGoal: true }
      },
      { id: 2, guid: 'facility-b', accountId: 'account-a' }
    ] as any,
    meters: [
      { guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Meter A', source: 'Electricity' },
      { guid: 'meter-b', accountId: 'account-a', facilityId: 'facility-b', name: 'Meter B', source: 'Natural Gas', meterNumber: 'B-1' }
    ] as any,
    meterData: [{ guid: 'data-a', accountId: 'account-a', facilityId: 'facility-a', meterId: 'meter-a', year: 2024 }] as any,
    meterGroups: [],
    predictors: [
      { guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a' },
      { guid: 'predictor-b', accountId: 'account-a', facilityId: 'facility-b' }
    ] as any,
    predictorData: [{ guid: 'predictor-data-b', accountId: 'account-a', facilityId: 'facility-b', predictorId: 'predictor-b' }] as any,
    facilityAnalyses: [{
      guid: 'analysis-a',
      accountId: 'account-a',
      facilityId: 'facility-a',
      groups: [{ idbGroupId: 'group-a', analysisType: 'regression' }]
    }] as any,
    accountAnalyses: [{
      guid: 'account-analysis-a',
      accountId: 'account-a',
      facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: 'analysis-a' }]
    }] as any,
    accountReports: [{ guid: 'account-report-a', accountId: 'account-a', name: 'Account report' }] as any,
    facilityReports: [{
      guid: 'facility-report-a',
      accountId: 'account-a',
      facilityId: 'facility-a',
      analysisReportSettings: { reportYear: 2024 }
    }] as any,
    customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  };
}

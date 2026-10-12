import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import {
  accountAnalysisResultsFingerprint,
  buildAccountAnalysisResultsRequest
} from './account-analysis-results-request';

describe('account analysis results request', () => {
  const analysis = {
    guid: 'account-analysis-a', name: 'Portfolio A', analysisCategory: 'energy', baselineYear: 2022,
    energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal',
    facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: 'facility-analysis-a' }]
  } as IdbAccountAnalysisItem;
  const snapshot = {
    account: { guid: 'account-a', name: 'Account A', fiscalYear: 'calendarYear', assessmentReportVersion: 'AR6' },
    facilities: [{ guid: 'facility-a', name: 'Facility A', accountId: 'account-a', fiscalYear: 'calendarYear' }],
    facilityAnalyses: [{
      guid: 'facility-analysis-a', name: 'Facility A analysis', accountId: 'account-a', facilityId: 'facility-a',
      analysisCategory: 'energy', energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2022,
      hasBanking: true, bankedAnalysisItemId: 'banked-a', groups: []
    }, {
      guid: 'banked-a', name: 'Banked source', accountId: 'account-a', facilityId: 'facility-a',
      analysisCategory: 'energy', energyIsSource: true, energyUnit: 'MMBtu', waterUnit: 'gal', baselineYear: 2021,
      hasBanking: false, groups: []
    }],
    meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [], accountAnalyses: [analysis],
    accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [],
    energyUseGroups: [], energyUseEquipment: []
  } as unknown as AccountWorkspaceSnapshot;

  it('includes selected facility analyses and their banking dependencies', () => {
    const request = buildAccountAnalysisResultsRequest(analysis, snapshot);
    expect(request.allAccountAnalysisItems.map(item => item.guid)).toEqual(['facility-analysis-a', 'banked-a']);
  });

  it('ignores display-only names but changes for calculation-bearing setup', () => {
    const request = buildAccountAnalysisResultsRequest(analysis, snapshot);
    const renamed = structuredClone(request);
    renamed.accountAnalysisItem.name = 'Renamed portfolio';
    renamed.account.name = 'Renamed account';
    renamed.accountFacilities[0].name = 'Renamed facility';
    expect(accountAnalysisResultsFingerprint(renamed)).toBe(accountAnalysisResultsFingerprint(request));

    const changed = structuredClone(request);
    changed.accountAnalysisItem.baselineYear = 2023;
    expect(accountAnalysisResultsFingerprint(changed)).not.toBe(accountAnalysisResultsFingerprint(request));
  });
});

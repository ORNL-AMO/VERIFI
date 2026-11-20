import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { getNewIdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { AccountWorkspaceSnapshot } from '../account-workspace.models';
import { AnalysisUsageSource } from '../analysis-usage.models';

export function analysisUsageFixture() {
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a', name: 'Account', isSingleFacilityCompany: false };
  const facility = { ...getNewIdbFacility(account), id: 1, guid: 'facility-a', name: 'Plant' };
  const other = { ...getNewIdbFacility(account), id: 2, guid: 'facility-other', name: 'Other plant' };
  const analysis = { ...getNewIdbAnalysisItem(account, facility, [], [], 'energy'), id: 1, guid: 'analysis-a',
    name: 'Plant baseline', energyIsSource: true, baselineYear: 2022 };
  const accountAnalysis = { ...getNewIdbAccountAnalysisItem('energy', account, [facility, other]), id: 1,
    guid: 'account-analysis-a', name: 'Portfolio baseline', baselineYear: 2022, energyIsSource: true };
  const snapshot: AccountWorkspaceSnapshot = { account, facilities: [facility, other],
    facilityAnalyses: [analysis], accountAnalyses: [accountAnalysis], accountReports: [], facilityReports: [],
    meterGroups: [], meters: [], meterData: [], predictors: [], predictorData: [], customEmissions: [], customFuels: [],
    customGWPs: [], energyUseGroups: [], energyUseEquipment: [], savedVisualizations: [], homeOwners: [], homeDashboards: [] };
  const source: AnalysisUsageSource = { scope: 'facility', accountGuid: account.guid, facilityGuid: facility.guid, analysisGuid: analysis.guid };
  return { account, facility, other, analysis, accountAnalysis, snapshot, source };
}

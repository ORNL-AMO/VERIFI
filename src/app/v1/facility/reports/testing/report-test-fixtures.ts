import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbFacilityReport, IdbFacilityReport } from '@data/models/idbModels/facilityReport';

export const reportAccount = { guid: 'account-a', name: 'Account A', displayEmissions: true } as IdbAccount;
export const reportFacility = { guid: 'facility-a', accountId: 'account-a', name: 'Facility A' } as IdbFacility;
export function reportFixture(overrides: Partial<IdbFacilityReport> = {}): IdbFacilityReport {
  return { ...getNewIdbFacilityReport('facility-a', 'account-a', 'analysis', []),
    id: 10, guid: 'report-a', name: 'Saved report', createdDate: new Date(2024, 0, 1), modifiedDate: new Date(2025, 0, 1), ...overrides };
}
export function reportSnapshot(reports: readonly IdbFacilityReport[] = [reportFixture()]): AccountWorkspaceSnapshot {
  return {
    account: reportAccount, facilities: [reportFacility], facilityReports: reports,
    meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: [], accountAnalyses: [], accountReports: [], customEmissions: [], customFuels: [],
    customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  };
}

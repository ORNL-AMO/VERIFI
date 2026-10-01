import { IndexedDbTestRecord, IndexedDbTestSeed, mergeIndexedDbSeeds } from './indexed-db-test-harness';

export interface IndexedDbAccountFixture {
  account: IndexedDbTestRecord;
  facility: IndexedDbTestRecord;
  meter: IndexedDbTestRecord;
  meterData: IndexedDbTestRecord;
  meterGroup: IndexedDbTestRecord;
  deprecatedPredictor: IndexedDbTestRecord;
  predictor: IndexedDbTestRecord;
  predictorData: IndexedDbTestRecord;
  facilityAnalysis: IndexedDbTestRecord;
  accountAnalysis: IndexedDbTestRecord;
  accountReport: IndexedDbTestRecord;
  facilityReport: IndexedDbTestRecord;
  customEmissions: IndexedDbTestRecord;
  customFuel: IndexedDbTestRecord;
  customGwp: IndexedDbTestRecord;
  energyUseGroup: IndexedDbTestRecord;
  energyUseEquipment: IndexedDbTestRecord;
  electronBackup: IndexedDbTestRecord;
  seed: IndexedDbTestSeed;
}

export function createIndexedDbAccountFixture(
  label: 'a' | 'b',
  accountId: number,
  childId: number
): IndexedDbAccountFixture {
  const accountGuid = `account-${label}`;
  const facilityGuid = `facility-${label}`;
  const meterGuid = `meter-${label}`;
  const meterGroupGuid = `meter-group-${label}`;
  const predictorGuid = `predictor-${label}`;
  const energyUseGroupGuid = `energy-use-group-${label}`;

  const account = {
    id: accountId,
    guid: accountGuid,
    name: `Account ${label.toUpperCase()}`,
    deleteAccount: false
  };
  const facility = {
    id: childId,
    guid: facilityGuid,
    accountId: accountGuid,
    name: `Facility ${label.toUpperCase()}`
  };
  const meter = {
    id: childId,
    guid: meterGuid,
    accountId: accountGuid,
    facilityId: facilityGuid,
    groupId: meterGroupGuid,
    name: `Meter ${label.toUpperCase()}`
  };
  const meterData = {
    id: childId,
    guid: `meter-data-${label}`,
    accountId: accountGuid,
    facilityId: facilityGuid,
    meterId: meterGuid,
    totalEnergyUse: childId
  };
  const meterGroup = {
    id: childId,
    guid: meterGroupGuid,
    accountId: accountGuid,
    facilityId: facilityGuid,
    name: `Meter Group ${label.toUpperCase()}`
  };
  const deprecatedPredictor = {
    id: childId,
    guid: `deprecated-predictor-${label}`,
    accountId: accountGuid,
    facilityId: facilityGuid,
    predictors: []
  };
  const predictor = {
    id: childId,
    guid: predictorGuid,
    accountId: accountGuid,
    facilityId: facilityGuid,
    name: `Predictor ${label.toUpperCase()}`
  };
  const predictorData = {
    id: childId,
    guid: `predictor-data-${label}`,
    accountId: accountGuid,
    facilityId: facilityGuid,
    predictorId: predictorGuid,
    amount: childId
  };
  const facilityAnalysis = {
    id: childId,
    guid: `facility-analysis-${label}`,
    accountId: accountGuid,
    facilityId: facilityGuid,
    name: `Facility Analysis ${label.toUpperCase()}`
  };
  const accountAnalysis = {
    id: childId,
    guid: `account-analysis-${label}`,
    accountId: accountGuid,
    name: `Account Analysis ${label.toUpperCase()}`
  };
  const accountReport = {
    id: childId,
    guid: `account-report-${label}`,
    accountId: accountGuid,
    name: `Account Report ${label.toUpperCase()}`
  };
  const facilityReport = {
    id: childId,
    guid: `facility-report-${label}`,
    accountId: accountGuid,
    facilityId: facilityGuid,
    name: `Facility Report ${label.toUpperCase()}`
  };
  const customEmissions = {
    id: childId,
    guid: `custom-emissions-${label}`,
    accountId: accountGuid,
    name: `Custom Emissions ${label.toUpperCase()}`
  };
  const customFuel = {
    id: childId,
    guid: `custom-fuel-${label}`,
    accountId: accountGuid,
    name: `Custom Fuel ${label.toUpperCase()}`
  };
  const customGwp = {
    id: childId,
    guid: `custom-gwp-${label}`,
    accountId: accountGuid,
    name: `Custom GWP ${label.toUpperCase()}`
  };
  const energyUseGroup = {
    id: childId,
    guid: energyUseGroupGuid,
    accountId: accountGuid,
    facilityId: facilityGuid,
    name: `Energy Use Group ${label.toUpperCase()}`
  };
  const energyUseEquipment = {
    id: childId,
    guid: `energy-use-equipment-${label}`,
    accountId: accountGuid,
    facilityId: facilityGuid,
    energyUseGroupId: energyUseGroupGuid,
    name: `Energy Use Equipment ${label.toUpperCase()}`
  };
  const electronBackup = {
    id: childId,
    guid: `electron-backup-${label}`,
    accountId: accountGuid,
    dataBackupId: `backup-${label}`
  };

  return {
    account,
    facility,
    meter,
    meterData,
    meterGroup,
    deprecatedPredictor,
    predictor,
    predictorData,
    facilityAnalysis,
    accountAnalysis,
    accountReport,
    facilityReport,
    customEmissions,
    customFuel,
    customGwp,
    energyUseGroup,
    energyUseEquipment,
    electronBackup,
    seed: {
      accounts: [account],
      facilities: [facility],
      utilityMeter: [meter],
      utilityMeterData: [meterData],
      utilityMeterGroups: [meterGroup],
      predictors: [deprecatedPredictor],
      predictor: [predictor],
      predictorData: [predictorData],
      analysisItems: [facilityAnalysis],
      accountAnalysisItems: [accountAnalysis],
      accountReports: [accountReport],
      facilityReports: [facilityReport],
      customEmissionsItems: [customEmissions],
      customFuels: [customFuel],
      customGWP: [customGwp],
      facilityEnergyUseGroups: [energyUseGroup],
      facilityEnergyUseEquipment: [energyUseEquipment],
      electronBackups: [electronBackup]
    }
  };
}

export const accountAFixture = createIndexedDbAccountFixture('a', 1, 101);
export const accountBFixture = createIndexedDbAccountFixture('b', 2, 201);

export const globalPersistenceSeed: IndexedDbTestSeed = {
  application: [{ id: 1, guid: 'application-instance' }],
  analyticsData: [{ id: 1, clientId: 'analytics-client' }]
};

export const twoAccountPersistenceSeed = mergeIndexedDbSeeds(
  accountAFixture.seed,
  accountBFixture.seed,
  globalPersistenceSeed
);

import { WorkspaceBackupSnapshotBuilder } from './backup-snapshot-builder.service';
import { CURRENT_DATA_VERSION } from '../indexedDB/data-migrations/data-migration.models';
import { AccountWorkspaceSnapshot } from '../account-workspace/account-workspace.models';

describe('WorkspaceBackupSnapshotBuilder', () => {
  it('builds an account backup from one snapshot and removes local machine backup fields', () => {
    const builder = new WorkspaceBackupSnapshotBuilder();
    const snapshot = createSnapshot();

    const backup = builder.buildAccountBackup(snapshot);

    expect(backup.dataVersion).toBe(CURRENT_DATA_VERSION);
    expect(backup.backupFileType).toBe('Account');
    expect(backup.dataBackupId).toBeTruthy();
    expect(backup.account.guid).toBe('account-a');
    expect(backup.account.dataBackupFilePath).toBeUndefined();
    expect(backup.account.dataBackupId).toBeUndefined();
    expect(backup.account.lastBackup).toBeUndefined();
    expect(backup.facilities).toHaveLength(2);
    expect(backup.facilityAnalysisItems[0].groups[0].models).toEqual([]);
    expect(snapshot.account.dataBackupFilePath).toBe('/tmp/account-a.json');
  });

  it('builds a facility backup without cross-facility leakage', () => {
    const builder = new WorkspaceBackupSnapshotBuilder();
    const snapshot = createSnapshot();

    const backup = builder.buildFacilityBackup(snapshot, 'facility-a');

    expect(backup.backupFileType).toBe('Facility');
    expect(backup.dataBackupId).toBeTruthy();
    expect(backup.facility.guid).toBe('facility-a');
    expect(backup.meters.map(item => item.facilityId)).toEqual(['facility-a']);
    expect(backup.groups.map(item => item.facilityId)).toEqual(['facility-a']);
    expect(backup.predictors.map(item => item.facilityId)).toEqual(['facility-a']);
    expect(backup.facilityReports.map(item => item.facilityId)).toEqual(['facility-a']);
  });
});

function createSnapshot(): AccountWorkspaceSnapshot {
  return {
    account: {
      guid: 'account-a',
      name: 'Account A',
      dataBackupFilePath: '/tmp/account-a.json',
      dataBackupId: 'machine-local',
      lastBackup: new Date('2026-08-01T12:00:00.000Z')
    },
    facilities: [
      { guid: 'facility-a', accountId: 'account-a', name: 'Facility A' },
      { guid: 'facility-b', accountId: 'account-a', name: 'Facility B' }
    ],
    meters: [
      { guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a', meterNumber: 'A', name: 'A' },
      { guid: 'meter-b', accountId: 'account-a', facilityId: 'facility-b', meterNumber: 'B', name: 'B' }
    ],
    meterData: [
      { guid: 'meter-data-a', accountId: 'account-a', facilityId: 'facility-a', meterId: 'meter-a', meterNumber: 'A', totalEnergyUse: 1, year: 2026, month: 1, day: 1 },
      { guid: 'meter-data-b', accountId: 'account-a', facilityId: 'facility-b', meterId: 'meter-b', meterNumber: 'B', totalEnergyUse: 2, year: 2026, month: 1, day: 1 }
    ],
    meterGroups: [
      { guid: 'group-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Group A', groupType: 'Energy', combinedMonthlyData: [1] },
      { guid: 'group-b', accountId: 'account-a', facilityId: 'facility-b', name: 'Group B', groupType: 'Energy', combinedMonthlyData: [2] }
    ],
    predictors: [
      { guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Predictor A' },
      { guid: 'predictor-b', accountId: 'account-a', facilityId: 'facility-b', name: 'Predictor B' }
    ],
    predictorData: [
      { guid: 'predictor-data-a', accountId: 'account-a', facilityId: 'facility-a', predictorId: 'predictor-a', amount: 1, year: 2026, month: 1 },
      { guid: 'predictor-data-b', accountId: 'account-a', facilityId: 'facility-b', predictorId: 'predictor-b', amount: 2, year: 2026, month: 1 }
    ],
    facilityAnalyses: [
      { guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', baselineYear: 2026, groups: [{ idbGroupId: 'group-a', predictorVariables: [], models: [] }] }
    ],
    accountAnalyses: [],
    accountReports: [],
    facilityReports: [
      { guid: 'facility-report-a', accountId: 'account-a', facilityId: 'facility-a' },
      { guid: 'facility-report-b', accountId: 'account-a', facilityId: 'facility-b' }
    ],
    customEmissions: [],
    customFuels: [],
    customGWPs: [],
    energyUseGroups: [
      { guid: 'energy-group-a', accountId: 'account-a', facilityId: 'facility-a' },
      { guid: 'energy-group-b', accountId: 'account-a', facilityId: 'facility-b' }
    ],
    energyUseEquipment: [
      { guid: 'equipment-a', accountId: 'account-a', facilityId: 'facility-a', energyUseGroupId: 'energy-group-a', utilityMeterGroupIds: ['group-a'] },
      { guid: 'equipment-b', accountId: 'account-a', facilityId: 'facility-b', energyUseGroupId: 'energy-group-b', utilityMeterGroupIds: ['group-b'] }
    ]
  } as unknown as AccountWorkspaceSnapshot;
}

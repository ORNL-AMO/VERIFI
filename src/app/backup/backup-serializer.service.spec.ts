import { JsonBackupSerializer } from './backup-serializer.service';
import { BackupFile } from '../models/backup-file';

describe('JsonBackupSerializer', () => {
  it('uses the legacy backup field names when serializing', () => {
    const serializer = new JsonBackupSerializer();
    const backup = createBackup();

    const json = serializer.serialize(backup);
    const parsed = JSON.parse(json);

    expect(parsed.predictorData).toEqual([]);
    expect(parsed.predictorDataV2).toEqual([]);
    expect(parsed.backupFileType).toBe('Account');
  });

  it('builds deterministic file names from the backup scope and timestamp', () => {
    const serializer = new JsonBackupSerializer();
    const backup = createBackup();

    expect(serializer.getFileName(backup)).toBe('Account_A_Backup_2026-8-7.json');
    expect(serializer.getFileName(backup, 'zip')).toBe('Account_A_Backup_2026-8-7.zip');
  });
});

function createBackup(): BackupFile {
  return {
    dataVersion: 1,
    account: { guid: 'account-a', name: 'Account A' } as any,
    facilities: [],
    facility: undefined,
    meters: [],
    meterData: [],
    groups: [],
    accountReports: [],
    accountAnalysisItems: [],
    facilityAnalysisItems: [],
    predictorData: [],
    predictorDataV2: [],
    predictors: [],
    customEmissionsItems: [],
    customFuels: [],
    customGWPs: [],
    origin: 'VERIFI',
    backupFileType: 'Account',
    timeStamp: new Date('2026-08-07T12:00:00.000Z'),
    dataBackupId: 'backup-a',
    facilityReports: [],
    facilityEnergyUseGroups: [],
    facilityEnergyUseEquipment: []
  };
}

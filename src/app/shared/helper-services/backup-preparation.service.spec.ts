import { BackupFile } from '../../models/backup-file';
import { BackupPreparationService, BackupRelationshipError, FutureBackupVersionError, InvalidBackupError } from './backup-preparation.service';

describe('BackupPreparationService', () => {
  const service = new BackupPreparationService();

  function accountBackup(): BackupFile {
    return {
      account: { guid: 'account', name: 'Legacy' } as any,
      facilities: [{ guid: 'facility', accountId: 'account', name: 'Plant' } as any],
      facility: undefined,
      meters: [{ guid: 'meter', accountId: 'account', facilityId: 'facility', source: 'Water' } as any],
      meterData: [{ guid: 'reading', accountId: 'account', facilityId: 'facility', meterId: 'meter', readDate: '2024-01-31' } as any],
      groups: [], accountReports: [], accountAnalysisItems: [], facilityAnalysisItems: [],
      predictorData: [], predictorDataV2: [], predictors: [], customEmissionsItems: [],
      customFuels: [], customGWPs: [], facilityReports: [], facilityEnergyUseGroups: [],
      facilityEnergyUseEquipment: [], origin: 'VERIFI', backupFileType: 'Account',
      timeStamp: new Date(), dataBackupId: 'backup'
    };
  }

  it('clones and migrates an unversioned account backup', () => {
    const input = accountBackup();
    const prepared = service.prepare(input);
    expect(prepared.dataVersion).toBe(1);
    expect(prepared.account.electricityUnit).toBe('kWh');
    expect(prepared.meters[0].source).toBe('Water Intake');
    expect(prepared.meterData[0]).toMatchObject({ year: 2024, month: 1, day: 31 });
    expect(input.dataVersion).toBeUndefined();
    expect(input.account.electricityUnit).toBeUndefined();
  });

  it('defaults missing legacy collections and preserves optional dangling references', () => {
    const input = accountBackup() as any;
    delete input.facilityReports;
    delete input.facilityEnergyUseEquipment;
    input.account.selectedEnergyAnalysisId = 'missing-optional-analysis';
    const prepared = service.prepare(input);
    expect(prepared.facilityReports).toEqual([]);
    expect(prepared.facilityEnergyUseEquipment).toEqual([]);
    expect(prepared.account.selectedEnergyAnalysisId).toBe('missing-optional-analysis');
  });

  it('rejects future, invalid, and broken core relationships', () => {
    expect(() => service.prepare({ ...accountBackup(), dataVersion: 2 })).toThrow(FutureBackupVersionError);
    expect(() => service.prepare({ ...accountBackup(), dataVersion: -1 })).toThrow(InvalidBackupError);
    const broken = accountBackup();
    broken.meterData[0].meterId = 'missing';
    expect(() => service.prepare(broken)).toThrow(BackupRelationshipError);
  });
});

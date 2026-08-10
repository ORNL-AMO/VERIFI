import { BackupFile } from '../models/backup-file';
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

  it('sanitizes machine-local account backup fields but preserves top-level backup metadata', () => {
    const input = accountBackup();
    input.account.dataBackupFilePath = '/tmp/legacy-machine-path.json';
    input.account.dataBackupId = 'legacy-machine-backup-id';
    input.account.lastBackup = new Date('2026-08-01T00:00:00.000Z');

    const prepared = service.prepare(input);

    expect(prepared.account.dataBackupFilePath).toBeUndefined();
    expect(prepared.account.dataBackupId).toBeUndefined();
    expect(prepared.account.lastBackup).toBeUndefined();
    expect(prepared.dataBackupId).toBe('backup');
    expect(input.account.dataBackupFilePath).toBe('/tmp/legacy-machine-path.json');
    expect(input.account.dataBackupId).toBe('legacy-machine-backup-id');
    expect(input.account.lastBackup).toEqual(new Date('2026-08-01T00:00:00.000Z'));
  });

  it('rejects future, invalid, and broken core relationships', () => {
    expect(() => service.prepare({ ...accountBackup(), dataVersion: 2 })).toThrow(FutureBackupVersionError);
    expect(() => service.prepare({ ...accountBackup(), dataVersion: -1 })).toThrow(InvalidBackupError);
    const broken = accountBackup();
    broken.meterData[0].meterId = 'missing';
    expect(() => service.prepare(broken)).toThrow(BackupRelationshipError);
    const wrongAccount = service.extractFacility(service.prepare(accountBackup()), 'facility');
    wrongAccount.meters[0].accountId = 'other-account';
    expect(() => service.prepare(wrongAccount)).toThrow(BackupRelationshipError);
  });

  it('extracts every facility-scoped collection without cross-facility records', () => {
    const input = accountBackup();
    input.facilities.push({ guid: 'other-facility', accountId: 'account', name: 'Other' } as any);
    input.groups.push(
      { guid: 'group', accountId: 'account', facilityId: 'facility' } as any,
      { guid: 'other-group', accountId: 'account', facilityId: 'other-facility' } as any
    );
    input.facilityReports.push(
      { guid: 'report', accountId: 'account', facilityId: 'facility' } as any,
      { guid: 'other-report', accountId: 'account', facilityId: 'other-facility' } as any
    );
    input.facilityEnergyUseGroups.push(
      { guid: 'energy-group', accountId: 'account', facilityId: 'facility' } as any,
      { guid: 'other-energy-group', accountId: 'account', facilityId: 'other-facility' } as any
    );
    input.facilityEnergyUseEquipment.push(
      { guid: 'equipment', accountId: 'account', facilityId: 'facility', energyUseGroupId: 'energy-group', utilityMeterGroupIds: ['group'] } as any,
      { guid: 'other-equipment', accountId: 'account', facilityId: 'other-facility', energyUseGroupId: 'other-energy-group', utilityMeterGroupIds: ['other-group'] } as any
    );
    input.meters[0].groupId = 'group';

    const prepared = service.prepare(input);
    const facility = service.extractFacility(prepared, 'facility');

    expect(facility.backupFileType).toBe('Facility');
    expect(facility.facility.guid).toBe('facility');
    expect(facility.groups.map(item => item.guid)).toEqual(['group']);
    expect(facility.facilityReports.map(item => item.guid)).toEqual(['report']);
    expect(facility.facilityEnergyUseGroups.map(item => item.guid)).toEqual(['energy-group']);
    expect(facility.facilityEnergyUseEquipment.map(item => item.guid)).toEqual(['equipment']);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BackupImportCoordinator } from '@data/backup/backup-import-coordinator.service';
import { FutureBackupVersionError } from '@data/backup/backup-preparation.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { vi } from 'vitest';
import { ImportAccountBackupComponent } from './import-account-backup.component';

describe('ImportAccountBackupComponent', () => {
  let fixture: ComponentFixture<ImportAccountBackupComponent>;
  let prepareTextBackup: ReturnType<typeof vi.fn>;
  let importNewAccount: ReturnType<typeof vi.fn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    prepareTextBackup = vi.fn();
    importNewAccount = vi.fn(async () => ({ guid: 'imported-account', name: 'Imported Account' } as IdbAccount));
    TestBed.configureTestingModule({
      imports: [ImportAccountBackupComponent],
      providers: [
        { provide: BackupImportCoordinator, useValue: { prepareTextBackup, importNewAccount } }
      ]
    });
    fixture = TestBed.createComponent(ImportAccountBackupComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('rejects non-VERIFI, facility, and future-version backups', async () => {
    prepareTextBackup.mockReturnValueOnce({ origin: 'OTHER', backupFileType: 'Account' });
    await fixture.componentInstance.setImportFile(fileEvent('not-verifi.json'));
    expect(fixture.componentInstance.backupFileError).toContain('does not come from VERIFI');

    prepareTextBackup.mockReturnValueOnce({ origin: 'VERIFI', backupFileType: 'Facility' });
    await fixture.componentInstance.setImportFile(fileEvent('facility.json'));
    expect(fixture.componentInstance.backupFileError).toContain('facility backup');

    prepareTextBackup.mockImplementationOnce(() => {
      throw new FutureBackupVersionError(99);
    });
    await fixture.componentInstance.setImportFile(fileEvent('future.json'));
    expect(fixture.componentInstance.backupFileError).toContain('newer version of VERIFI');
  });

  it('imports a valid account backup and emits the new account', async () => {
    const completed = vi.fn();
    fixture.componentInstance.completed.subscribe(completed);
    prepareTextBackup.mockReturnValue({
      origin: 'VERIFI',
      backupFileType: 'Account',
      account: { guid: 'backup-account', name: 'Backup Account' },
      facilities: [{ guid: 'facility-a' }],
      meters: [{ guid: 'meter-a' }]
    });

    await fixture.componentInstance.setImportFile(fileEvent('account.json'));
    await fixture.componentInstance.importBackupFile();

    expect(importNewAccount).toHaveBeenCalled();
    expect(completed).toHaveBeenCalledWith(expect.objectContaining({ guid: 'imported-account' }));
  });
});

function fileEvent(name: string): Event {
  const file = { name, text: vi.fn(async () => '{"origin":"VERIFI"}') };
  return { target: { files: [file] } } as unknown as Event;
}

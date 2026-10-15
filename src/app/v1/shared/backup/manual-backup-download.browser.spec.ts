import { DestroyableInjector, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import JSZip from 'jszip';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { BackupExportCoordinator } from '@data/backup/backup-export-coordinator.service';
import { BrowserBackupDownloadService } from '@data/backup/browser-backup-download.service';
import { WorkspaceBackupSnapshotBuilder } from '@data/backup/backup-snapshot-builder.service';
import { JsonBackupSerializer } from '@data/backup/backup-serializer.service';
import { BackupPreparationService } from '@data/backup/backup-preparation.service';
import { BackupImportCommandService } from '@data/backup/backup-import-command.service';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { BackupFile } from '@data/models/backup-file';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { NotificationService } from '@app/v1/shared/notifications/notification.service';
import { ManualBackupDownloadService } from './manual-backup-download.service';

describe('manual backup downloads in Chromium', () => {
  let harness: IndexedDbTestHarness;
  let injector: DestroyableInjector;
  let service: ManualBackupDownloadService;
  let store: AccountWorkspaceStore;
  let snapshot: AccountWorkspaceSnapshot;
  let links: Array<{ href: string; name: string }>;
  let zipBlob: Blob | undefined;

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('manual-backup-download');
    const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a', name: 'Account A' };
    snapshot = {
      account,
      facilities: ['facility-a', 'facility-b'].map((guid, index) => ({
        ...getNewIdbFacility(account), id: index + 1, guid, name: guid
      })),
      meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
      facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [],
      customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
    };
    snapshot = { ...snapshot, meters: snapshot.facilities.map(facility => ({
      ...getNewIdbUtilityMeter(facility.guid, account.guid, true, 'MMBtu'),
      guid: `meter-${facility.guid}`, name: `Meter for ${facility.name}`
    })) };
    await harness.seed({ accounts: [account, { ...account, id: 2, guid: 'account-b', name: 'Account B' }] });
    store = new AccountWorkspaceStore();
    store.publish(snapshot);
    const downloads = new BrowserBackupDownloadService();
    links = [];
    zipBlob = undefined;
    // Exercise native URL/Blob creation and anchor attributes without saving files from the test runner.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      links.push({ href: this.href, name: this.download });
    });
    const createUrl = URL.createObjectURL.bind(URL);
    vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
      zipBlob = blob as Blob;
      return createUrl(blob);
    });
    const exports = new BackupExportCoordinator(
      store, {} as any, new WorkspaceBackupSnapshotBuilder(), new JsonBackupSerializer(), downloads
    );
    injector = Injector.create({ parent: TestBed.inject(Injector), providers: [
      ManualBackupDownloadService, WorkspaceCommandBoundary,
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: AccountWorkspaceService, useValue: {} },
      { provide: BackupExportCoordinator, useValue: exports },
      { provide: AccountCommandHandler, useValue: TestBed.inject(AccountCommandHandler) },
      { provide: ApplicationLifecycleService, useValue: { refreshAccountCatalog: vi.fn(async () => []) } },
      { provide: UnsavedChangesService, useValue: new UnsavedChangesService() },
      { provide: NotificationService, useValue: { success: vi.fn(), warning: vi.fn(), danger: vi.fn() } }
    ] });
    service = injector.get(ManualBackupDownloadService);
  });

  afterEach(async () => {
    injector?.destroy();
    vi.restoreAllMocks();
    await harness.destroy();
  });

  it.each(['json', 'zip'] as const)('delivers complete account %s and persists its date only for that account', async format => {
    await service.download({ scope: 'account', accountGuid: 'account-a', format });
    expect(links).toHaveLength(1);
    expect(links[0].name).toMatch(new RegExp(`^Account_A_Backup_.*\\.${format}$`));
    let text: string;
    if (format === 'json') {
      expect(links[0].href).toMatch(/^data:application\/json/);
      text = decodeURIComponent(links[0].href.split(',')[1]);
    } else {
      expect(links[0].href).toMatch(/^blob:/);
      const zip = await JSZip.loadAsync(await zipBlob!.arrayBuffer());
      const filenames = Object.keys(zip.files);
      expect(filenames).toHaveLength(1);
      expect(filenames[0]).toBe(links[0].name.replace(/\.zip$/, '.json'));
      text = await zip.files[filenames[0]].async('string');
    }
    const backup = JSON.parse(text) as BackupFile;
    expect(backup.account.guid).toBe('account-a');
    expect(backup.facilities.map(item => item.guid)).toEqual(['facility-a', 'facility-b']);
    expect(backup.meters.map(item => item.facilityId)).toEqual(['facility-a', 'facility-b']);
    expect(backup.account.lastBackup).toBeUndefined();
    const stored = await harness.getAll<any>('accounts');
    expect(stored.find(item => item.guid === 'account-a').lastBackup).toBeInstanceOf(Date);
    expect(stored.find(item => item.guid === 'account-b').lastBackup).toBeUndefined();
    // Preparation still strips machine-local dates before restore.
    const prepared = new BackupPreparationService().prepare(backup);
    const restore = new BackupImportCommandService(TestBed.inject(IndexedDbTransactionService), {
      setCurrentLoadingIndex: vi.fn(), setLoadingMessage: vi.fn()
    } as any);
    const restored = await restore.importAccountBackupFile(prepared, 0);
    const facilities = await harness.getAll<any>('facilities');
    expect(facilities.filter(item => item.accountId === restored.guid)).toHaveLength(2);
    const meters = await harness.getAll<any>('utilityMeter');
    expect(meters).toHaveLength(2);
    expect(meters.every(meter => meter.accountId === restored.guid && facilities.some(facility => facility.guid === meter.facilityId))).toBe(true);
    expect(restored.lastBackup).toBeUndefined();
    injector.destroy();
    injector = undefined;
    await harness.reopen();
    const reopened = await harness.getAll<any>('accounts');
    expect(reopened.find(item => item.guid === 'account-a').lastBackup).toEqual(stored[0].lastBackup);
    expect(reopened.find(item => item.guid === 'account-b').lastBackup).toBeUndefined();
  });

  it('delivers only the requested facility without recording an account backup', async () => {
    await service.download({ scope: 'facility', accountGuid: 'account-a', facilityGuid: 'facility-a', format: 'json' });
    const backup = JSON.parse(decodeURIComponent(links[0].href.split(',')[1])) as BackupFile;
    expect(backup.backupFileType).toBe('Facility');
    expect(backup.facility.guid).toBe('facility-a');
    expect(backup.meters.map(item => item.guid)).toEqual(['meter-facility-a']);
    expect(backup.facilities).toEqual([]);
    expect(backup.account).toBeUndefined();
    expect((await harness.getAll<any>('accounts')).every(account => !account.lastBackup)).toBe(true);
    expect(new BackupPreparationService().prepare(backup).facility.guid).toBe('facility-a');
  });
});

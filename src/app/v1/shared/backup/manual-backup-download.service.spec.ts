import { TestBed } from '@angular/core/testing';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { BackupExportCoordinator } from '@data/backup/backup-export-coordinator.service';
import { WorkspaceBackupSnapshotBuilder } from '@data/backup/backup-snapshot-builder.service';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { NotificationService } from '@app/v1/shared/notifications/notification.service';
import { ManualBackupDownloadService, ManualBackupRequest } from './manual-backup-download.service';

describe('ManualBackupDownloadService', () => {
  const request: ManualBackupRequest = { scope: 'account', accountGuid: 'account-a', format: 'json' };
  let store: AccountWorkspaceStore;
  let service: ManualBackupDownloadService;
  let edits: { flushPendingChanges: ReturnType<typeof vi.fn>; hasUnsavedChanges: ReturnType<typeof vi.fn> };
  let exports: { buildActiveAccountBackup: ReturnType<typeof vi.fn>; buildFacilityBackup: ReturnType<typeof vi.fn>; deliverToBrowser: ReturnType<typeof vi.fn> };
  let handler: { update: ReturnType<typeof vi.fn> };
  let commands: { execute: ReturnType<typeof vi.fn> };
  let lifecycle: { refreshAccountCatalog: ReturnType<typeof vi.fn> };
  let notifications: { success: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn>; danger: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 12));
    store = new AccountWorkspaceStore();
    store.publish(snapshot());
    const builder = new WorkspaceBackupSnapshotBuilder();
    edits = { flushPendingChanges: vi.fn(async () => true), hasUnsavedChanges: vi.fn(() => false) };
    exports = {
      buildActiveAccountBackup: vi.fn(() => builder.buildAccountBackup(store.snapshot()!)),
      buildFacilityBackup: vi.fn(guid => builder.buildFacilityBackup(store.snapshot()!, guid)),
      deliverToBrowser: vi.fn(async () => undefined)
    };
    handler = { update: vi.fn(async account => account) };
    commands = { execute: vi.fn(async (options, persist) => {
      const value = await persist();
      store.publishCommittedPatch(options.publication.buildPatch(value));
      return { value };
    }) };
    lifecycle = { refreshAccountCatalog: vi.fn(async () => []) };
    notifications = { success: vi.fn(), warning: vi.fn(), danger: vi.fn() };
    TestBed.configureTestingModule({ providers: [
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: BackupExportCoordinator, useValue: exports },
      { provide: WorkspaceCommandBoundary, useValue: commands },
      { provide: AccountCommandHandler, useValue: handler },
      { provide: ApplicationLifecycleService, useValue: lifecycle },
      { provide: UnsavedChangesService, useValue: edits },
      { provide: NotificationService, useValue: notifications }
    ] });
    service = TestBed.inject(ManualBackupDownloadService);
    TestBed.tick();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it.each(['json', 'zip'] as const)('flushes edits before capturing %s and records only after delivery', async format => {
    edits.flushPendingChanges.mockImplementation(async () => {
      store.publishCommittedPatch({ account: { ...store.account()!, name: 'Saved name' } });
      return true;
    });
    exports.deliverToBrowser.mockImplementation(async backup => {
      expect(backup.account.name).toBe('Saved name');
      expect(handler.update).not.toHaveBeenCalled();
    });
    await service.download({ ...request, format });
    expect(exports.deliverToBrowser).toHaveBeenCalledWith(expect.objectContaining({ backupFileType: 'Account' }), format === 'zip', expect.any(AbortSignal));
    expect(store.account()?.lastBackup).toEqual(new Date());
    expect(lifecycle.refreshAccountCatalog).toHaveBeenCalledOnce();
    expect(notifications.success).toHaveBeenCalledWith('Backup download started for Saved name.', expect.anything());
    expect(service.preparing()).toBe(false);
  });

  it('merges the date with the latest account inside the command queue', async () => {
    const execute = commands.execute.getMockImplementation()! as (options: unknown, persist: () => Promise<unknown>) => Promise<unknown>;
    commands.execute.mockImplementation(async (options, persist) => {
      store.publishCommittedPatch({ account: { ...store.account()!, notes: 'Another edit' } });
      return execute(options, persist);
    });
    await service.download(request);
    expect(store.account()?.notes).toBe('Another edit');
    expect(store.account()?.lastBackup).toEqual(new Date());
  });

  it('prevents duplicate submissions across entry points', async () => {
    let finish: (value: boolean) => void;
    edits.flushPendingChanges.mockReturnValue(new Promise<boolean>(resolve => finish = resolve));
    const first = service.download(request);
    expect(service.preparing()).toBe(true);
    expect(service.available()).toBe(false);
    await service.download({ ...request, format: 'zip' });
    finish!(true);
    await first;
    expect(exports.deliverToBrowser).toHaveBeenCalledOnce();
  });

  it.each(['false', 'reject', 'dirty'])('does not download when pending edits fail: %s', failure => {
    if (failure === 'false') edits.flushPendingChanges.mockResolvedValue(false);
    if (failure === 'reject') edits.flushPendingChanges.mockRejectedValue(new Error('save failed'));
    if (failure === 'dirty') edits.hasUnsavedChanges.mockReturnValue(true);
    return service.download(request).then(() => {
      expect(exports.deliverToBrowser).not.toHaveBeenCalled();
      expect(handler.update).not.toHaveBeenCalled();
      expect(notifications.danger).toHaveBeenCalledOnce();
    });
  });

  it('preserves data and the prior date when delivery fails', async () => {
    const previous = store.snapshot();
    exports.deliverToBrowser.mockRejectedValue(new Error('download failed'));
    await service.download(request);
    expect(store.snapshot()).toBe(previous);
    expect(handler.update).not.toHaveBeenCalled();
    expect(notifications.danger).toHaveBeenCalledOnce();
    expect(service.available()).toBe(true);
  });

  it('reports timestamp failure separately after a download has started', async () => {
    handler.update.mockRejectedValue(new Error('database failed'));
    await service.download(request);
    expect(store.account()?.lastBackup).toBeUndefined();
    expect(notifications.warning).toHaveBeenCalledWith('Download started, but the backup date could not be recorded.', expect.anything());
    expect(notifications.danger).not.toHaveBeenCalled();
    expect(notifications.success).not.toHaveBeenCalled();
  });

  it('keeps a recorded date when only the catalog refresh fails', async () => {
    lifecycle.refreshAccountCatalog.mockRejectedValue(new Error('catalog unavailable'));
    await service.download(request);
    expect(store.account()?.lastBackup).toEqual(new Date());
    expect(notifications.warning).toHaveBeenCalledWith('Download started, but the account list could not be refreshed.', expect.anything());
    expect(exports.deliverToBrowser).toHaveBeenCalledOnce();
  });

  it('disables backups while the workspace is unavailable or a write is pending', async () => {
    store.setPending({ id: 1, label: 'Saving edits' });
    expect(service.available()).toBe(false);
    await service.download(request);
    store.clearPending(1);
    store.beginLoad(true);
    expect(service.available()).toBe(false);
    await service.download(request);
    expect(edits.flushPendingChanges).not.toHaveBeenCalled();
    expect(exports.deliverToBrowser).not.toHaveBeenCalled();
  });

  it('cancels an account superseded during ZIP preparation without a false success', async () => {
    let finish: () => void;
    exports.deliverToBrowser.mockImplementation(async (_backup, _zip, signal: AbortSignal) => {
      await new Promise<void>(resolve => finish = resolve);
      signal.throwIfAborted();
    });
    const pending = service.download({ ...request, format: 'zip' });
    await Promise.resolve();
    store.beginLoad(true);
    TestBed.tick();
    store.publish(snapshot('account-b'));
    TestBed.tick();
    finish!();
    await pending;
    expect(handler.update).not.toHaveBeenCalled();
    expect(notifications.success).not.toHaveBeenCalled();
    expect(notifications.danger).not.toHaveBeenCalled();
    expect(store.account()?.guid).toBe('account-b');
  });

  it('never records the date against another account after delivery', async () => {
    exports.deliverToBrowser.mockImplementation(async () => store.publish(snapshot('account-b')));
    await service.download(request);
    expect(handler.update).not.toHaveBeenCalled();
    expect(store.account()?.lastBackup).toBeUndefined();
    expect(notifications.warning).toHaveBeenCalledOnce();
  });

  it('does not reset the account reminder for facility JSON', async () => {
    await service.download({ scope: 'facility', accountGuid: 'account-a', facilityGuid: 'facility-a', format: 'json' });
    expect(exports.deliverToBrowser).toHaveBeenCalledWith(expect.objectContaining({ backupFileType: 'Facility' }), false, expect.any(AbortSignal));
    expect(handler.update).not.toHaveBeenCalled();
    expect(store.account()?.lastBackup).toBeUndefined();
    expect(notifications.success).toHaveBeenCalledWith('Backup download started for Facility A.', expect.anything());
  });

  it('updates reminders at local midnight and when returning to the app', async () => {
    store.publishCommittedPatch({ account: { ...store.account()!, lastBackup: new Date(2026, 9, 9) } });
    expect(service.reminder().tone).toBe('quiet');
    await vi.advanceTimersByTimeAsync(12 * 60 * 60 * 1000);
    expect(service.reminder().tone).toBe('recommended');
    vi.setSystemTime(new Date(2026, 10, 15));
    window.dispatchEvent(new Event('focus'));
    expect(service.reminder().tone).toBe('overdue');
    store.publish(snapshot('account-b'));
    expect(service.reminder().label).toBe('No backup recorded');
  });
});

function snapshot(guid = 'account-a'): AccountWorkspaceSnapshot {
  const account = { ...getNewIdbAccount(), guid, id: 1, name: 'Account A' };
  return {
    account,
    facilities: [{ ...getNewIdbFacility(account), guid: 'facility-a', name: 'Facility A' }],
    meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [],
    customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  };
}

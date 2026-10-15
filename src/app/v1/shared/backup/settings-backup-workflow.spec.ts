import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { BackupExportCoordinator } from '@data/backup/backup-export-coordinator.service';
import { WorkspaceBackupSnapshotBuilder } from '@data/backup/backup-snapshot-builder.service';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
import { AccountSettingsProfileComponent } from '@app/v1/account/settings/profile/account-settings-profile.component';
import { FacilitySettingsProfileComponent } from '@app/v1/facility/settings/profile/facility-settings-profile.component';
import { AppearanceService } from '@app/v1/appearance/appearance.service';
import { ShellHeaderComponent } from '@app/v1/shell/header/shell-header.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { NotificationService } from '@app/v1/shared/notifications/notification.service';
import { ManualBackupDownloadService } from './manual-backup-download.service';

describe('header backup with live Settings drafts', () => {
  let store: AccountWorkspaceStore;
  let exports: { buildActiveAccountBackup: ReturnType<typeof vi.fn>; deliverToBrowser: ReturnType<typeof vi.fn> };
  let writes: { update: ReturnType<typeof vi.fn> };
  let edits: UnsavedChangesService;
  let backups: ManualBackupDownloadService;
  let header: ComponentFixture<ShellHeaderComponent>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    store = new AccountWorkspaceStore();
    const account = { ...getNewIdbAccount(), guid: 'account-a', name: 'Account A' };
    const facility = { ...getNewIdbFacility(account), guid: 'facility-a', name: 'Facility A' };
    const snapshot: AccountWorkspaceSnapshot = {
      account, facilities: [facility], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
      facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [],
      customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
    };
    store.publish(snapshot, { facility });
    exports = {
      buildActiveAccountBackup: vi.fn(() => new WorkspaceBackupSnapshotBuilder().buildAccountBackup(store.snapshot()!)),
      deliverToBrowser: vi.fn(async () => undefined)
    };
    writes = { update: vi.fn(async value => value) };
    TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule, IconComponent],
      declarations: [ShellHeaderComponent, AccountSettingsProfileComponent, FacilitySettingsProfileComponent],
      providers: [SettingsFormService,
        { provide: AccountWorkspaceStore, useValue: store },
        { provide: BackupExportCoordinator, useValue: exports },
        { provide: AccountCommandHandler, useValue: writes },
        { provide: FacilityCommandHandler, useValue: writes },
        { provide: WorkspaceCommandBoundary, useValue: {
          execute: vi.fn(async (options, persist) => {
            const value = await persist();
            store.publishCommittedPatch(options.publication.buildPatch(value));
            return { value };
          })
        } },
        { provide: ApplicationLifecycleService, useValue: { refreshAccountCatalog: vi.fn(async () => []) } },
        { provide: NotificationService, useValue: { success: vi.fn(), warning: vi.fn(), danger: vi.fn() } },
        { provide: WorkspaceNavigationService, useValue: {
          account: store.account, accountOptions: () => [], isWorkspaceRoute: () => true, isSupportPanelOpen: () => false
        } },
        { provide: AppearanceService, useValue: {} }
      ]
    });
    backups = TestBed.inject(ManualBackupDownloadService);
    edits = TestBed.inject(UnsavedChangesService);
    header = TestBed.createComponent(ShellHeaderComponent);
    header.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each(['account', 'facility'] as const)('preserves an invalid %s profile and blocks the header download', async scope => {
    const profile = createProfile(scope);
    input(profile, 'name', '');
    input(profile, 'notes', 'Do not discard my draft');
    await vi.advanceTimersByTimeAsync(600);
    await clickHeaderBackup();
    profile.detectChanges();
    expect(exports.deliverToBrowser).not.toHaveBeenCalled();
    expect(writes.update).not.toHaveBeenCalled();
    expect(store.account()?.lastBackup).toBeUndefined();
    expect(profile.componentInstance.form.controls['name'].value).toBe('');
    expect(profile.componentInstance.form.controls['notes'].value).toBe('Do not discard my draft');
    expect(edits.hasUnsavedChanges()).toBe(true);
    expect(profile.nativeElement.textContent).toContain('Name is required');
  });

  it.each(['account', 'facility'] as const)('flushes a valid %s edit before snapshot capture and clears its debounce', async scope => {
    const profile = createProfile(scope);
    input(profile, 'notes', 'Include this immediately');
    await clickHeaderBackup();
    const backup = exports.deliverToBrowser.mock.calls[0][0];
    expect(scope === 'account' ? backup.account.notes : backup.facilities[0].notes).toBe('Include this immediately');
    expect(store.account()?.lastBackup).toBeInstanceOf(Date);
    expect(edits.hasUnsavedChanges()).toBe(false);
    const writesAfterBackup = writes.update.mock.calls.length;
    await vi.advanceTimersByTimeAsync(600);
    expect(writes.update).toHaveBeenCalledTimes(writesAfterBackup);
  });

  it('preserves the draft and prior date when Settings persistence fails', async () => {
    const profile = createProfile('account');
    writes.update.mockRejectedValue(new Error('save failed'));
    input(profile, 'notes', 'Keep failed edits');
    await clickHeaderBackup();
    profile.detectChanges();
    expect(exports.deliverToBrowser).not.toHaveBeenCalled();
    expect(store.account()?.lastBackup).toBeUndefined();
    expect(profile.componentInstance.form.controls['notes'].value).toBe('Keep failed edits');
    expect(profile.componentInstance.saveState).toBe('error');
  });

  it('awaits an in-flight blur save before reporting the editor flushed', async () => {
    const profile = createProfile('account');
    let finish: () => void;
    writes.update.mockImplementationOnce(async value => {
      await new Promise<void>(resolve => finish = resolve);
      return value;
    });
    input(profile, 'notes', 'Saving on blur');
    profile.componentInstance.flushProfileSave();
    let flushed = false;
    const pending = edits.flushPendingChanges().then(result => { flushed = result; });
    await Promise.resolve();
    expect(flushed).toBe(false);
    finish!();
    await pending;
    expect(flushed).toBe(true);
    expect(edits.hasUnsavedChanges()).toBe(false);
  });

  it('preserves edits made during ZIP preparation when the backup date publishes', async () => {
    const profile = createProfile('account');
    let finish: () => void;
    exports.deliverToBrowser.mockImplementationOnce(() => new Promise<void>(resolve => finish = resolve));
    const pending = backups.download({ scope: 'account', accountGuid: 'account-a', format: 'zip' });
    await Promise.resolve();
    input(profile, 'name', '');
    input(profile, 'notes', 'Edited during preparation');
    finish!();
    await pending;
    profile.detectChanges();
    expect(store.account()?.lastBackup).toBeInstanceOf(Date);
    expect(profile.componentInstance.form.controls['notes'].value).toBe('Edited during preparation');
    expect(profile.componentInstance.form.controls['name'].value).toBe('');
    expect(edits.hasUnsavedChanges()).toBe(true);
  });

  it('blocks export if the draft changes again while its awaited save is running', async () => {
    const profile = createProfile('account');
    let finish: () => void;
    writes.update.mockImplementationOnce(async value => {
      await new Promise<void>(resolve => finish = resolve);
      return value;
    });
    input(profile, 'notes', 'First edit');
    const pending = clickHeaderBackup();
    await Promise.resolve();
    input(profile, 'name', '');
    input(profile, 'notes', 'New unresolved edit');
    finish!();
    await pending;
    profile.detectChanges();
    expect(exports.deliverToBrowser).not.toHaveBeenCalled();
    expect(store.account()?.lastBackup).toBeUndefined();
    expect(profile.componentInstance.form.controls['notes'].value).toBe('New unresolved edit');
    expect(profile.componentInstance.form.controls['name'].value).toBe('');
  });

  it('discards a Settings draft through the existing navigation confirmation', async () => {
    const profile = createProfile('account');
    input(profile, 'name', '');
    input(profile, 'notes', 'Discard this draft');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    expect(edits.confirmDiscard()).toBe(true);
    expect(profile.componentInstance.form.controls['name'].value).toBe('Account A');
    expect(profile.componentInstance.form.controls['notes'].value).toBe('');
    expect(edits.hasUnsavedChanges()).toBe(false);
    await vi.advanceTimersByTimeAsync(600);
    expect(writes.update).not.toHaveBeenCalled();
  });

  it('unregisters destroyed editors and loads a different account without carrying its draft', () => {
    const profile = createProfile('account');
    input(profile, 'notes', 'Draft for account A');
    store.publish({ ...store.snapshot()!, account: { ...store.account()!, guid: 'account-b', name: 'Account B' } });
    profile.detectChanges();
    expect(profile.componentInstance.form.controls['name'].value).toBe('Account B');
    expect(edits.hasUnsavedChanges()).toBe(false);
    input(profile, 'notes', 'Draft for account B');
    profile.destroy();
    expect(edits.hasUnsavedChanges()).toBe(false);
  });

  function createProfile(scope: 'account' | 'facility'): ComponentFixture<AccountSettingsProfileComponent | FacilitySettingsProfileComponent> {
    const fixture = scope === 'account'
      ? TestBed.createComponent(AccountSettingsProfileComponent)
      : TestBed.createComponent(FacilitySettingsProfileComponent);
    fixture.detectChanges();
    return fixture;
  }

  function input(fixture: ComponentFixture<unknown>, name: string, value: string): void {
    const field = fixture.nativeElement.querySelector(`[formControlName="${name}"]`) as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  async function clickHeaderBackup(): Promise<void> {
    const download = vi.spyOn(backups, 'download');
    (header.nativeElement.querySelector('.v1-header-backup__button') as HTMLButtonElement).click();
    await download.mock.results[0].value;
  }
});

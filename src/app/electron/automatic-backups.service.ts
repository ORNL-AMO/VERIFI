import { effect, Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { BackupExportCoordinator } from '../backup/backup-export-coordinator.service';
import { BackupPreparationService, FutureBackupVersionError, PreparedBackupFile } from '../backup/backup-preparation.service';
import { AccountWorkspaceState } from '../account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '../account-workspace/account-workspace.store';
import { ToastNotificationsService } from '../core-components/toast-notifications/toast-notifications.service';
import { ElectronBackupsDbService } from '../indexedDB/electron-backups-db.service';
import { ElectronBackupFileGateway } from './electron-backup-file.gateway';
import { IdbAccount } from '../models/idbModels/account';
import { getNewIdbElectronBackup, IdbElectronBackup } from '../models/idbModels/electronBackup';

export type AutomaticBackupStatus =
  | 'disabled'
  | 'checking'
  | 'ready'
  | 'pending'
  | 'saving'
  | 'conflict'
  | 'error';

@Injectable({
  providedIn: 'root'
})
export class AutomaticBackupsService {
  account: IdbAccount;
  saving = new BehaviorSubject<boolean>(false);
  status = new BehaviorSubject<AutomaticBackupStatus>('disabled');
  latestBackupFile = new BehaviorSubject<PreparedBackupFile | undefined>(undefined);
  reviewRequested = new BehaviorSubject<boolean>(false);
  accountBackups: IdbElectronBackup[] = [];

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private observingRevisions = false;
  private lastObservedRevision?: string;
  private activeWrite = false;
  private queuedRevisionKey?: string;
  private accountSessionToken = 0;
  private warnedIssues = new Set<string>();

  constructor(
    private readonly backupExportCoordinator: BackupExportCoordinator,
    private readonly backupPreparation: BackupPreparationService,
    private readonly backupGateway: ElectronBackupFileGateway,
    private readonly toastNotificationService: ToastNotificationsService,
    private readonly electronBackupsDbService: ElectronBackupsDbService,
    private readonly workspaceStore: AccountWorkspaceStore
  ) {
    effect(() => this.observeWorkspace(this.workspaceStore.state()));
  }

  subscribeData() {
    if (!this.backupGateway.isAvailable || this.observingRevisions) {
      this.setStatus(this.backupGateway.isAvailable ? 'disabled' : 'disabled');
      return;
    }
    this.observingRevisions = true;
    this.observeWorkspace(this.workspaceStore.state());
  }

  async initializeMetadata(): Promise<void> {
    this.accountBackups = await firstValueFrom(this.electronBackupsDbService.getAll());
  }

  async addOrUpdateFile(dataBackupId: string, accountId: string): Promise<void> {
    const existing = this.accountBackups.find(backup => backup.accountId === accountId);
    if (existing) {
      const updated = await firstValueFrom(this.electronBackupsDbService.updateWithObservable({
        ...existing,
        dataBackupId,
        timeStamp: new Date()
      }));
      this.accountBackups = this.accountBackups.map(item => item.id === updated.id ? updated : item);
      return;
    }
    const added = await firstValueFrom(this.electronBackupsDbService.addWithObservable(
      getNewIdbElectronBackup(accountId, dataBackupId)
    ));
    this.accountBackups = [...this.accountBackups, added];
  }

  async requestReview(): Promise<void> {
    this.reviewRequested.next(true);
    await this.inspectCurrentAccountFile();
  }

  clearReviewRequest(): void {
    this.reviewRequested.next(false);
  }

  async inspectCurrentAccountFile(): Promise<void> {
    const account = this.account;
    if (!this.backupGateway.isAvailable || !account) {
      this.latestBackupFile.next(undefined);
      this.setStatus('disabled');
      return;
    }
    const token = this.accountSessionToken;
    await this.inspectAttachedFile(account, token);
  }

  async overwriteFile(): Promise<void> {
    const account = this.account;
    if (!account?.dataBackupFilePath) {
      throw new Error('An automatic backup file must be selected before overwriting it.');
    }
    const exists = await this.backupGateway.exists(account.dataBackupFilePath);
    if (!exists) {
      this.latestBackupFile.next(undefined);
      this.setStatus('error');
      this.warnOnce('missing', 'Missing Backup File', 'The selected automatic backup file no longer exists. Choose a new backup location for this account.');
      return;
    }
    const backup = this.backupExportCoordinator.buildActiveAccountBackup();
    await this.backupGateway.write(account.dataBackupFilePath, backup);
    await this.addOrUpdateFile(backup.dataBackupId, account.guid);
    this.latestBackupFile.next(this.backupPreparation.prepare(backup));
    this.setStatus('ready');
  }

  private observeWorkspace(state: AccountWorkspaceState): void {
    if (!this.backupGateway.isAvailable || !this.observingRevisions) {
      this.clearDebounceTimer();
      this.setStatus('disabled');
      return;
    }
    if (state.status === 'loading' || state.status === 'switching') {
      this.clearDebounceTimer();
      this.saving.next(false);
      return;
    }

    const account = state.snapshot?.account;
    if (!account) {
      this.clearDebounceTimer();
      this.account = undefined;
      this.lastObservedRevision = undefined;
      this.latestBackupFile.next(undefined);
      this.clearReviewRequest();
      this.setStatus('disabled');
      return;
    }

    if (this.account?.guid !== account.guid) {
      this.handleAccountSwitch(account);
      return;
    }

    this.account = account;
    const revision = state.committedRevision;
    if (!revision || revision.accountGuid !== account.guid) {
      return;
    }
    const revisionKey = `${revision.accountGuid}:${revision.revision}`;
    if (revisionKey === this.lastObservedRevision) {
      return;
    }
    this.lastObservedRevision = revisionKey;
    this.scheduleCommittedSave(revisionKey);
  }

  private handleAccountSwitch(account: IdbAccount): void {
    this.clearDebounceTimer();
    this.saving.next(false);
    this.activeWrite = false;
    this.queuedRevisionKey = undefined;
    this.lastObservedRevision = undefined;
    this.account = account;
    this.accountSessionToken += 1;
    this.warnedIssues.clear();
    this.clearReviewRequest();
    this.latestBackupFile.next(undefined);
    void this.inspectAttachedFile(account, this.accountSessionToken);
  }

  private scheduleCommittedSave(revisionKey: string): void {
    if (!this.account?.dataBackupFilePath) {
      this.setStatus('disabled');
      return;
    }
    if (this.activeWrite) {
      this.queuedRevisionKey = revisionKey;
      return;
    }
    this.clearDebounceTimer();
    this.setStatus('pending');
    const token = this.accountSessionToken;
    this.debounceTimer = setTimeout(() => {
      void this.saveCommittedRevision(revisionKey, token);
    }, 3000);
  }

  private async saveCommittedRevision(revisionKey: string, token: number): Promise<void> {
    const account = this.account;
    if (!account?.dataBackupFilePath || token !== this.accountSessionToken || account.guid !== this.account?.guid) {
      return;
    }

    this.debounceTimer = undefined;
    this.activeWrite = true;
    this.saving.next(true);
    this.setStatus('saving');

    try {
      const exists = await this.backupGateway.exists(account.dataBackupFilePath);
      if (token !== this.accountSessionToken) {
        return;
      }
      if (!exists) {
        this.latestBackupFile.next(undefined);
        this.setStatus('error');
        this.warnOnce('missing', 'Missing Backup File', 'The selected automatic backup file no longer exists. Choose a new backup location for this account.');
        return;
      }

      const backup = this.backupExportCoordinator.buildActiveAccountBackup();
      await this.backupGateway.write(account.dataBackupFilePath, backup);
      await this.addOrUpdateFile(backup.dataBackupId, account.guid);
      if (token !== this.accountSessionToken) {
        return;
      }
      this.latestBackupFile.next(this.backupPreparation.prepare(backup));
      if (this.reviewRequested.value) {
        this.setStatus('conflict');
      } else {
        this.setStatus('ready');
      }
    } catch (error) {
      if (token !== this.accountSessionToken) {
        return;
      }
      this.setStatus('error');
      this.warnOnce(
        'write-failed',
        'Automatic Backup Failed',
        error instanceof Error ? error.message : 'VERIFI could not save the automatic backup file.'
      );
    } finally {
      this.activeWrite = false;
      this.saving.next(false);
      if (token !== this.accountSessionToken) {
        return;
      }
      if (this.queuedRevisionKey && this.queuedRevisionKey !== revisionKey) {
        const queued = this.queuedRevisionKey;
        this.queuedRevisionKey = undefined;
        this.setStatus('pending');
        this.debounceTimer = setTimeout(() => {
          void this.saveCommittedRevision(queued, token);
        }, 0);
      }
    }
  }

  private async inspectAttachedFile(account: IdbAccount, token: number): Promise<void> {
    if (!account.dataBackupFilePath) {
      this.latestBackupFile.next(undefined);
      this.setStatus('disabled');
      return;
    }
    this.setStatus('checking');
    try {
      const exists = await this.backupGateway.exists(account.dataBackupFilePath);
      if (token !== this.accountSessionToken) {
        return;
      }
      if (!exists) {
        this.latestBackupFile.next(undefined);
        this.setStatus('error');
        this.warnOnce('missing', 'Missing Backup File', 'The selected automatic backup file no longer exists. Choose a new backup location for this account.');
        return;
      }

      const raw = await this.backupGateway.read(account.dataBackupFilePath);
      if (token !== this.accountSessionToken) {
        return;
      }
      const prepared = this.backupPreparation.prepare(raw);
      this.latestBackupFile.next(prepared);
      const registry = this.accountBackups.find(backup => backup.accountId === account.guid);
      if (!registry || registry.dataBackupId !== prepared.dataBackupId) {
        this.setStatus('conflict');
      } else {
        this.setStatus(this.reviewRequested.value ? 'conflict' : 'ready');
      }
    } catch (error) {
      if (token !== this.accountSessionToken) {
        return;
      }
      this.latestBackupFile.next(undefined);
      this.setStatus('error');
      if (error instanceof FutureBackupVersionError) {
        this.warnOnce(
          'future-version',
          'Backup File Error',
          error.message
        );
      } else {
        this.warnOnce(
          'invalid-file',
          'Backup File Error',
          error instanceof Error ? error.message : 'The selected automatic backup file is invalid.'
        );
      }
    }
  }

  private warnOnce(code: string, title: string, message: string): void {
    if (!this.account?.guid) {
      return;
    }
    const key = `${this.account.guid}:${code}`;
    if (this.warnedIssues.has(key)) {
      return;
    }
    this.warnedIssues.add(key);
    this.toastNotificationService.showToast(title, message, 15000, false, 'alert-danger');
  }

  private setStatus(status: AutomaticBackupStatus): void {
    if (this.status.value !== status) {
      this.status.next(status);
    }
  }

  private clearDebounceTimer(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }
}

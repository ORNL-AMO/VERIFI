import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { BackupExportCoordinator } from '@data/backup/backup-export-coordinator.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { NotificationService } from '@app/v1/shared/notifications/notification.service';
import { getBackupReminder } from './backup-reminder';

export type ManualBackupRequest =
  | { readonly scope: 'account'; readonly accountGuid: string; readonly format: 'json' | 'zip' }
  | { readonly scope: 'facility'; readonly accountGuid: string; readonly facilityGuid: string; readonly format: 'json' };

@Injectable({ providedIn: 'root' })
export class ManualBackupDownloadService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly exports = inject(BackupExportCoordinator);
  private readonly edits = inject(UnsavedChangesService);
  private readonly commands = inject(WorkspaceCommandBoundary);
  private readonly accounts = inject(AccountCommandHandler);
  private readonly lifecycle = inject(ApplicationLifecycleService);
  private readonly notifications = inject(NotificationService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly clock = signal(new Date());
  private readonly activeRequest = signal<ManualBackupRequest | null>(null);
  private controller?: AbortController;
  private midnightTimer: ReturnType<typeof setTimeout>;

  readonly preparing = computed(() => this.activeRequest() !== null);
  readonly available = computed(() => this.workspace.isReady() && !this.workspace.hasPending() && !this.preparing());
  readonly reminder = computed(() => getBackupReminder(this.workspace.account()?.lastBackup, this.clock()));

  constructor() {
    effect(() => {
      const request = this.activeRequest();
      if (request && (this.workspace.isSwitching() || this.workspace.account()?.guid !== request.accountGuid)) {
        this.controller?.abort();
      }
    });
    this.updateClock();
    const onReturn = () => this.updateClock();
    this.document.addEventListener('visibilitychange', onReturn);
    this.document.defaultView?.addEventListener('focus', onReturn);
    this.destroyRef.onDestroy(() => {
      this.controller?.abort();
      clearTimeout(this.midnightTimer);
      this.document.removeEventListener('visibilitychange', onReturn);
      this.document.defaultView?.removeEventListener('focus', onReturn);
    });
  }

  async download(request: ManualBackupRequest): Promise<void> {
    if (!this.available() || this.workspace.account()?.guid !== request.accountGuid) return;
    const controller = new AbortController();
    this.controller = controller;
    this.activeRequest.set(request);
    let name = request.scope === 'facility'
      ? this.workspace.facilities().find(facility => facility.guid === request.facilityGuid)?.name ?? 'Selected facility'
      : this.workspace.account()!.name;
    let delivered = false;
    let dateRecorded = false;
    try {
      if (!await this.edits.flushPendingChanges() || this.edits.hasUnsavedChanges()) {
        throw new Error('Pending edits could not be saved.');
      }
      this.assertCurrent(request, controller.signal);
      if (this.workspace.hasPending()) throw new Error('Changes are still saving.');
      const backup = request.scope === 'account'
        ? this.exports.buildActiveAccountBackup()
        : this.exports.buildFacilityBackup(request.facilityGuid);
      name = request.scope === 'account' ? backup.account.name : backup.facility.name;
      await this.exports.deliverToBrowser(backup, request.format === 'zip', controller.signal);
      delivered = true;
      const initiatedAt = new Date();
      if (request.scope === 'account') {
        this.assertCurrent(request, controller.signal);
        await this.commands.execute({
          entityKind: 'account', changeKind: 'update', entityGuid: request.accountGuid,
          label: 'Recording backup date', notification: { suppressSuccessToast: true },
          publication: { mode: 'patch', buildPatch: account => ({ account }) }
        }, () => {
          this.assertCurrent(request, controller.signal);
          // Read inside the queue so another completed edit is never overwritten.
          return this.accounts.update({ ...this.workspace.account()!, lastBackup: initiatedAt }, request.accountGuid);
        });
        dateRecorded = true;
        await this.lifecycle.refreshAccountCatalog();
      }
      this.notifications.success(`Backup download started for ${name}.`, {
        message: 'Check your downloads to find the backup file.'
      });
    } catch {
      if (delivered) {
        this.notifications.warning(dateRecorded
          ? 'Download started, but the account list could not be refreshed.'
          : 'Download started, but the backup date could not be recorded.', {
          message: `Check your downloads for ${name}. ${dateRecorded ? 'Reopen the account list to refresh it.' : 'The backup reminder may still show the previous date.'}`
        });
      } else if (!controller.signal.aborted) {
        this.notifications.danger(`Backup could not be downloaded for ${name}.`, {
          message: 'Save any pending changes, then try downloading the backup again.'
        });
      }
    } finally {
      this.activeRequest.set(null);
      this.controller = undefined;
      this.updateClock();
    }
  }

  private assertCurrent(request: ManualBackupRequest, signal: AbortSignal): void {
    if (!this.workspace.isReady() || this.workspace.account()?.guid !== request.accountGuid) this.controller?.abort();
    signal.throwIfAborted();
  }

  private updateClock(): void {
    const now = new Date();
    this.clock.set(now);
    clearTimeout(this.midnightTimer);
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    this.midnightTimer = setTimeout(() => this.updateClock(), midnight.getTime() - now.getTime());
  }
}

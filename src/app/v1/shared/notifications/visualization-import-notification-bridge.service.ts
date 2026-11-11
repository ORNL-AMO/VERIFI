import { Injectable, effect, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { BackupImportCoordinator } from '@data/backup/backup-import-coordinator.service';
import { NotificationService } from './notification.service';

/** The shell owns presentation so restore feedback survives departure from an import panel. */
@Injectable({ providedIn: 'root' })
export class VisualizationImportNotificationBridgeService {
  private readonly imports = inject(BackupImportCoordinator);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly notifications = inject(NotificationService);
  private readonly presented = new WeakSet<object>();
  private notificationId?: string;
  private notificationAccount?: string;

  constructor() {
    effect(() => {
      const accountGuid = this.workspace.account()?.guid;
      const summary = this.imports.visualizationImportSummary();
      if (this.notificationAccount && this.notificationAccount !== accountGuid) {
        this.notifications.dismiss(this.notificationId!);
        this.notificationId = undefined;
        this.notificationAccount = undefined;
      }
      if (!summary || summary.accountGuid !== accountGuid || this.presented.has(summary)) return;
      this.presented.add(summary);
      if (this.notificationId) this.notifications.dismiss(this.notificationId);
      this.notificationId = undefined;
      this.notificationAccount = undefined;
      if (!summary.locked && !summary.repairRequired) return;
      const notification = this.notifications.warning('Saved visualizations need attention', {
        message: `Imported ${summary.total} saved visualization${summary.total === 1 ? '' : 's'}. `
          + `${summary.locked} locked; ${summary.repairRequired} require source repair. ${summary.reasons.join(' ')}`,
        durationMs: 0,
        retainOnOverflow: true,
        dismissible: true
      });
      this.notificationId = notification.id;
      this.notificationAccount = accountGuid;
    });
  }
}

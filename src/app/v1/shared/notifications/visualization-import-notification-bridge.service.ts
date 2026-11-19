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
      const homeAttention = !!summary.home && !!(summary.home.locked || summary.home.repairRequired);
      const chartAttention = !!(summary.locked || summary.repairRequired);
      if (!chartAttention && !homeAttention) return;
      const title = homeAttention ? chartAttention ? 'Imported views need attention' : 'Home dashboards need attention' : 'Saved visualizations need attention';
      const notification = this.notifications.warning(title, {
        message: (summary.total || !summary.home ? `Imported ${summary.total} saved visualization${summary.total === 1 ? '' : 's'}. `
          + `${summary.locked} locked; ${summary.repairRequired} require source repair. ` : '')
          + (summary.home ? `Imported ${summary.home.dashboards} Home dashboard${summary.home.dashboards === 1 ? '' : 's'} and their saved owner settings. ` : '')
          + summary.reasons.join(' '),
        durationMs: 0,
        retainOnOverflow: true,
        dismissible: true
      });
      this.notificationId = notification.id;
      this.notificationAccount = accountGuid;
    });
  }
}

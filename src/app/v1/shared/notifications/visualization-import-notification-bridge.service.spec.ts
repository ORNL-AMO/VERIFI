import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { BackupImportCoordinator } from '@data/backup/backup-import-coordinator.service';
import { VisualizationImportSummary } from '@data/backup/visualization-backup';
import { NotificationService } from './notification.service';
import { VisualizationImportNotificationBridgeService } from './visualization-import-notification-bridge.service';

describe('visualization restore feedback across navigation', () => {
  const summary = signal<VisualizationImportSummary | undefined>(undefined);
  const account = signal<{ guid: string } | undefined>(undefined);
  let notifications: NotificationService;

  beforeEach(() => {
    summary.set(undefined);
    account.set(undefined);
    TestBed.configureTestingModule({ providers: [NotificationService, VisualizationImportNotificationBridgeService,
      { provide: BackupImportCoordinator, useValue: { visualizationImportSummary: summary } },
      { provide: AccountWorkspaceStore, useValue: { account } }
    ] });
    notifications = TestBed.inject(NotificationService);
    TestBed.inject(VisualizationImportNotificationBridgeService);
  });

  it('waits for the imported account and retains one dismissible summary without a timer', () => {
    summary.set({ accountGuid: 'imported', total: 3, locked: 1, repairRequired: 1, reasons: ['Source relationships need review.'] });
    TestBed.tick();
    expect(notifications.notifications()).toEqual([]);
    account.set({ guid: 'imported' });
    TestBed.tick();
    const notice = notifications.notifications()[0];
    expect(notice).toMatchObject({ tone: 'warning', durationMs: 0, dismissible: true });
    expect(notice.message).toContain('Imported 3');
    expect(notice.message).toContain('1 locked; 1 require source repair');
    // Recreating routed content does not recreate the root bridge or re-announce the summary.
    account.set({ guid: 'imported' });
    TestBed.tick();
    expect(notifications.notifications()).toHaveLength(1);
    notifications.dismiss(notice.id);
    account.set({ guid: 'imported' });
    TestBed.tick();
    expect(notifications.notifications()).toEqual([]);
  });

  it('removes account-specific feedback on an account switch', () => {
    account.set({ guid: 'account-a' });
    summary.set({ accountGuid: 'account-a', total: 1, locked: 1, repairRequired: 0, reasons: [] });
    TestBed.tick();
    expect(notifications.notifications()).toHaveLength(1);
    account.set({ guid: 'account-b' });
    TestBed.tick();
    expect(notifications.notifications()).toEqual([]);
  });

  it('retains the restore warning across command notifications and clears it after a later clean restore', () => {
    account.set({ guid: 'account-a' });
    summary.set({ accountGuid: 'account-a', total: 1, locked: 1, repairRequired: 0, reasons: [] });
    TestBed.tick();
    const restoreNotice = notifications.notifications()[0];
    for (const name of ['One', 'Two', 'Three']) notifications.success(name, { durationMs: 0 });
    expect(notifications.notifications()).toContain(restoreNotice);
    summary.set({ accountGuid: 'account-a', total: 0, locked: 0, repairRequired: 0, reasons: [] });
    TestBed.tick();
    expect(notifications.notifications()).not.toContain(restoreNotice);
    expect(notifications.notifications().every(item => item.tone === 'success')).toBe(true);
  });

  it('does not warn for an import containing only usable definitions or no definitions', () => {
    account.set({ guid: 'account-a' });
    for (const total of [0, 2]) {
      summary.set({ accountGuid: 'account-a', total, locked: 0, repairRequired: 0, reasons: [] });
      TestBed.tick();
      expect(notifications.notifications()).toEqual([]);
    }
  });
});

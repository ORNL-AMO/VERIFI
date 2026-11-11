import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { userEvent } from 'vitest/browser';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { BackupImportCoordinator } from '@data/backup/backup-import-coordinator.service';
import { VisualizationImportSummary } from '@data/backup/visualization-backup';
import { NotificationsModule } from './notifications.module';
import { ToastHostComponent } from './toast-host.component';
import { VisualizationImportNotificationBridgeService } from './visualization-import-notification-bridge.service';
import { NotificationService } from './notification.service';

describe('visualization import feedback accessibility in Chromium', () => {
  let fixture: ComponentFixture<ToastHostComponent>;
  const summary = signal<VisualizationImportSummary | undefined>(undefined);

  beforeEach(() => {
    summary.set(undefined);
    TestBed.configureTestingModule({ imports: [NotificationsModule], providers: [
      VisualizationImportNotificationBridgeService,
      { provide: AccountWorkspaceStore, useValue: { account: signal({ guid: 'restored-account' }) } },
      { provide: BackupImportCoordinator, useValue: { visualizationImportSummary: summary } }
    ] });
    TestBed.inject(VisualizationImportNotificationBridgeService);
    fixture = TestBed.createComponent(ToastHostComponent);
  });
  afterEach(() => { fixture.destroy(); TestBed.resetTestingModule(); });

  it('announces the restore summary politely and supports keyboard dismissal after routed content changes', async () => {
    summary.set({ accountGuid: 'restored-account', total: 2, locked: 1, repairRequired: 1,
      reasons: ['Source relationships need explicit review.'] });
    TestBed.tick(); fixture.detectChanges();
    const notice = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(notice.getAttribute('aria-live')).toBe('polite');
    expect(notice.textContent).toContain('Imported 2');
    for (const name of ['One', 'Two', 'Three']) TestBed.inject(NotificationService).success(name, { durationMs: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.v1-toast--warning')).toBe(notice);
    const dismiss = notice.querySelector('button')!;
    expect(dismiss.getAttribute('aria-label')).toContain('Dismiss notification');
    dismiss.focus();
    expect(document.activeElement).toBe(dismiss);
    await userEvent.keyboard('{Enter}');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.v1-toast--warning')).toBeNull();
  });
});

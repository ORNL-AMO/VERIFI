import { PortalModule } from '@angular/cdk/portal';
import { Location } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { cdp, page, userEvent } from 'vitest/browser';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { BackupExportCoordinator } from '@data/backup/backup-export-coordinator.service';
import { AutomaticBackupsService } from '@platform/electron/automatic-backups.service';
import { ElectronBackupFileGateway } from '@platform/electron/electron-backup-file.gateway';
import { accountReportSnapshot } from '@app/v1/reports/account/testing/account-report-test-fixtures';
import { singleFacilityBackupCanonicalGuard, singleSiteAccountRedirectGuard } from '@app/v1/routing/canonical-route.guards';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { ManualBackupDownloadService } from '@app/v1/shared/backup/manual-backup-download.service';
import { FacilitySettingsComponent } from '@app/v1/facility/settings/facility-settings.component';
import { FacilitySettingsModule } from '@app/v1/facility/settings/facility-settings.module';
import { FacilitySettingsBackupComponent } from '@app/v1/facility/settings/backup/facility-settings-backup.component';
import { AccountSettingsComponent } from '../account-settings.component';
import { AccountSettingsModule } from '../account-settings.module';
import { AccountSettingsBackupComponent } from './account-settings-backup.component';

@Component({ standalone: true, imports: [RouterOutlet, PortalModule], template: '<main class="v1-root v1-palette-blueprint"><router-outlet/><ng-template [cdkPortalOutlet]="modal.activePortal()"/></main>' })
class SettingsHost { readonly modal = inject(ModalPortalService); }

async function setup() {
  const store = new AccountWorkspaceStore(); const snapshot = accountReportSnapshot(true);
  store.publish({ ...snapshot, account: { ...snapshot.account, name: 'Underlying account' }, facilities: [{ ...snapshot.facilities[0], name: 'Visible facility' }] });
  const writes = vi.fn(); const download = vi.fn(async () => undefined);
  TestBed.configureTestingModule({ imports: [SettingsHost, AccountSettingsModule, FacilitySettingsModule], providers: [
    provideRouter([
      { path: 'v1/workspace/account/:accountGuid/settings', component: AccountSettingsComponent, canActivateChild: [singleSiteAccountRedirectGuard], children: [{ path: 'backup', component: AccountSettingsBackupComponent }] },
      { path: 'v1/workspace/facility/:facilityGuid/settings', component: FacilitySettingsComponent, children: [{ path: 'backup', component: FacilitySettingsBackupComponent, canActivate: [singleFacilityBackupCanonicalGuard] }] }
    ]),
    { provide: AccountWorkspaceStore, useValue: store }, { provide: AccountWorkspaceService, useValue: {} },
    { provide: ApplicationLifecycleService, useValue: { usableAccounts: () => [store.account()], refreshAccountCatalog: vi.fn() } },
    { provide: WorkspaceStatusService, useValue: { state: signal('ready'), items: signal([]), discardedItems: signal([]) } },
    { provide: AccountCommandHandler, useValue: { update: writes } }, { provide: FacilityCommandHandler, useValue: {} },
    { provide: WorkspaceCommandBoundary, useValue: { execute: writes } }, { provide: BackupExportCoordinator, useValue: {} },
    { provide: AutomaticBackupsService, useValue: { status: new BehaviorSubject('disabled'), saving: new BehaviorSubject(false) } },
    { provide: ElectronBackupFileGateway, useValue: { isAvailable: false } },
    { provide: ManualBackupDownloadService, useValue: { available: signal(true), preparing: signal(false), reminder: () => ({ label: 'No backup recorded', detail: 'Backup recommended' }), download } }
  ] });
  const fixture = TestBed.createComponent(SettingsHost); fixture.detectChanges();
  const router = TestBed.inject(Router); router.setUpLocationChangeListener();
  await router.navigateByUrl('/v1/workspace/facility/facility-a/settings/backup'); fixture.detectChanges(); await fixture.whenStable();
  return { store, fixture, router, writes, download, root: fixture.nativeElement.querySelector('main') as HTMLElement };
}

describe('single-facility Settings and Backup browser presentation', () => {
  it('canonicalizes to complete Backup, keeps explicit facility tools, and supports keyboard use in narrow themed windows', async () => {
    const view = await setup();
    expect(view.router.url).toBe('/v1/workspace/account/account-a/settings/backup');
    const navigation = TestBed.inject(WorkspaceNavigationService);
    expect(navigation.facilitySettingsRoute('facility-a', 'backup')).toEqual(['/v1', 'workspace', 'account', 'account-a', 'settings', 'backup']);
    expect(view.root.querySelector('.page-identity__crumb')).toBeNull();
    expect(view.root.textContent).toContain('Complete backup');
    const secondary = view.root.querySelector<HTMLElement>('details summary')!; secondary.focus();
    await userEvent.keyboard('{Enter}'); view.fixture.detectChanges();
    expect(view.root.querySelector('details')?.open).toBe(true);
    const tools = view.fixture.debugElement.query(By.directive(FacilitySettingsBackupComponent)).componentInstance as FacilitySettingsBackupComponent;
    expect(tools.facility()?.guid).toBe('facility-a'); expect(view.store.selectedFacility()).toBeUndefined();
    tools.openBackupConfirm(); view.fixture.detectChanges();
    expect(view.root.querySelector('[role="dialog"]')?.textContent).toContain('Visible facility');
    expect(tools.backupRequest).toEqual({ scope: 'facility', accountGuid: 'account-a', facilityGuid: 'facility-a', format: 'json' });
    tools.cancelBackupConfirm(); view.fixture.detectChanges();
    const complete = view.fixture.debugElement.query(By.directive(AccountSettingsBackupComponent)).componentInstance as AccountSettingsBackupComponent;
    complete.openBackupConfirm(); await complete.confirmBackupDownload(); view.fixture.detectChanges();
    expect(view.download).toHaveBeenCalledWith({ scope: 'account', accountGuid: 'account-a', format: 'json' });
    expect(view.writes).not.toHaveBeenCalled();
    for (const dark of [false, true]) for (const width of [1100, 640, 390]) {
      await page.viewport(width, 850); view.root.classList.toggle('v1-theme-dark', dark); view.root.classList.add('v1-contrast-strong');
      view.fixture.detectChanges(); await view.fixture.whenStable();
      expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
    }
    await (cdp() as any).send('Emulation.setEmulatedMedia', { media: 'print', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    try {
      expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
      expect(getComputedStyle(view.root.querySelector('h1')!).display).not.toBe('none');
      await page.screenshot({ element: view.root, path: '../../../../../../.angular/phase5-settings-print.png' });
    } finally { await (cdp() as any).send('Emulation.setEmulatedMedia', { media: '', features: [] }); }
    view.fixture.destroy();
  });
  it('retains account Backup through Back/Forward and returns facility-only tools after conversion', async () => {
    const view = await setup(); const location = TestBed.inject(Location);
    await view.router.navigateByUrl('/v1/workspace/account/account-a/settings/backup?source=header');
    location.back(); await vi.waitFor(() => expect(view.router.url).toBe('/v1/workspace/account/account-a/settings/backup'));
    location.forward(); await vi.waitFor(() => expect(view.router.url).toContain('source=header'));
    const before = view.store.snapshot()!;
    view.store.publish({ ...before, account: { ...before.account, isSingleFacilityCompany: false } }); view.fixture.detectChanges();
    await view.router.navigateByUrl('/v1/workspace/facility/facility-a/settings/backup'); view.fixture.detectChanges(); await view.fixture.whenStable();
    expect(view.router.url).toBe('/v1/workspace/facility/facility-a/settings/backup');
    expect(view.root.querySelector('app-account-settings-backup')).toBeNull();
    expect(view.store.accountAnalyses()).toEqual(before.accountAnalyses); expect(view.store.accountReports()).toEqual(before.accountReports);
    expect(TestBed.inject(WorkspaceNavigationService).singleFacilityContext()).toBeUndefined();
    view.fixture.destroy();
  });
});

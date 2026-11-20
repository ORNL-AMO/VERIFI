import { ComponentPortal, PortalModule } from '@angular/cdk/portal';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { setupAccountReportWorkbench } from '../../../account/testing/account-report-workbench-test-setup';
import { accountReportSnapshot } from '../../../account/testing/account-report-test-fixtures';
import { setupReportWorkbench } from '../../../facility/testing/report-workbench-test-setup';
import { reportFixture } from '../../../facility/testing/report-test-fixtures';
import { ACCOUNT_REPORT_TYPES, FACILITY_REPORT_TYPES } from '../../../catalog/report-catalog';
import { REPORT_AUTOSAVE_DEBOUNCE_MS } from '../../editing/report-autosave-controller';
import { ReportSetupDeleteComponent } from './report-setup-delete.component';

@Component({ standalone: true, imports: [PortalModule], template: '<ng-template [cdkPortalOutlet]="modal.activePortal()"/>' })
class DeletePortalHost { readonly modal = inject(ModalPortalService); }
@Component({ standalone: true, template: 'Owning Reports dashboard' })
class DashboardDestination {}

async function setup(scope: 'account' | 'facility' = 'account') {
  const recover = vi.fn(async (_account: string) => {});
  TestBed.configureTestingModule({ imports: [DeletePortalHost], providers: [
    provideRouter([{ path: 'v1/workspace/account/:accountGuid/reports/dashboard', component: DashboardDestination }]),
    { provide: WorkspaceCommandBoundary, useValue: { recoverCommittedPublication: recover } }
  ] });
  const view = scope === 'account' ? await setupAccountReportWorkbench() : await setupReportWorkbench();
  const page = await view.open();
  const deletion = view.harness.routeDebugElement!.query(By.directive(ReportSetupDeleteComponent)).componentInstance as ReportSetupDeleteComponent;
  const editor = page.workbench.session()!.runtime.editor;
  const portal = TestBed.createComponent(DeletePortalHost); portal.detectChanges();
  const button = view.harness.routeNativeElement!.querySelector<HTMLButtonElement>('app-report-setup-delete button')!;
  const render = () => { view.harness.detectChanges(); portal.detectChanges(); };
  const dialog = () => portal.nativeElement.querySelector('[role="dialog"]') as HTMLElement | null;
  return { ...view, page, deletion, editor, portal, button, render, dialog, recover };
}

describe.each(['account', 'facility'] as const)('%s report Setup deletion', scope => {
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); vi.useRealTimers(); });

  it('cancels without losing an unsaved draft and resumes eligible autosave', async () => {
    const view = await setup(scope); vi.useFakeTimers();
    view.editor.name.setValue('Unsaved name');
    await view.deletion.request(); view.render();
    expect(view.dialog()?.textContent).toContain(scope === 'account' ? 'Saved account report' : 'Saved report');
    expect(view.dialog()?.textContent).toContain(scope === 'account' ? 'Account A' : 'Facility A');
    expect(view.dialog()?.textContent).not.toContain('Unsaved name');
    expect(await view.page.workbench.flush()).toBe(false);
    expect(await TestBed.inject(UnsavedChangesService).resolveNavigationPreflight()).toBe(false);
    await vi.advanceTimersByTimeAsync(REPORT_AUTOSAVE_DEBOUNCE_MS + 1);
    expect(view.store.committedRevision()).toBeUndefined();
    view.dialog()!.querySelector<HTMLButtonElement>('[aria-label="Cancel report deletion"]')!.click(); view.render();
    expect(view.dialog()).toBeNull(); expect(view.editor.name.value).toBe('Unsaved name');
    expect(await view.editor.flush()).toBe(true);
    const saved = scope === 'account' ? view.store.accountReports()[0] : view.store.facilityReports()[0];
    expect(saved.name).toBe('Unsaved name'); expect(view.deleteReport).not.toHaveBeenCalled();
  });

  it('retains an invalid draft after persistence failure and deletes through the existing action on retry', async () => {
    const view = await setup(scope);
    const before = view.store.snapshot()!;
    const navigate = vi.spyOn(view.router, 'navigate').mockResolvedValue(true);
    view.editor.name.setValue(''); await view.deletion.request(); view.render();
    view.deleteReport.mockRejectedValueOnce(new Error('Disk full'));
    await view.deletion.confirm(); view.render();
    expect(view.dialog()?.textContent).toContain('Disk full'); expect(view.editor.name.value).toBe('');
    expect(navigate).not.toHaveBeenCalled();
    await view.deletion.confirm(); view.render();
    expect(view.deleteReport).toHaveBeenCalledTimes(2);
    expect(view.deleteReport.mock.calls[1]).toEqual(scope === 'account' ? ['account-report'] : ['facility-a', 'report-a']);
    expect(view.store.accountAnalyses()).toEqual(before.accountAnalyses);
    expect(view.store.facilityAnalyses()).toEqual(before.facilityAnalyses);
    expect(view.store.meters()).toEqual(before.meters);
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'account', 'account-a', 'reports', 'dashboard'],
      { queryParams: scope === 'facility' ? { facility: 'facility-a' } : {}, replaceUrl: true });
    expect(await view.editor.flush()).toBe(true);
  });

  it('blocks repeated submissions, cancellation, and routing during deletion', async () => {
    const view = await setup(scope);
    let finish!: () => void;
    view.deleteReport.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    await view.deletion.request(); const operation = view.deletion.confirm(); view.render();
    await view.deletion.request(); await view.deletion.confirm(); view.deletion.cancel();
    expect(view.deleteReport).toHaveBeenCalledOnce();
    expect([...view.dialog()!.querySelectorAll<HTMLButtonElement>('button')].every(button => button.disabled)).toBe(true);
    expect(await view.router.navigateByUrl('/elsewhere')).toBe(false);
    expect(await TestBed.inject(UnsavedChangesService).resolveNavigationPreflight()).toBe(false);
    vi.spyOn(view.router, 'navigate').mockResolvedValue(true);
    finish(); await operation;
  });

  it('blocks stage and report navigation even when there were no unsaved edits', async () => {
    const view = await setup(scope);
    await view.deletion.request(); view.render();
    expect(await view.router.navigateByUrl(view.router.url.replace('/setup', '/report'))).toBe(false);
    expect(await TestBed.inject(UnsavedChangesService).flushPendingChanges()).toBe(false);
    expect(view.deletion.session()).toBeDefined();
    view.deletion.cancel();
    expect(await TestBed.inject(UnsavedChangesService).flushPendingChanges()).toBe(true);
  });

  it('waits for unrelated workspace commands before enabling confirmation', async () => {
    const view = await setup(scope);
    view.store.setPending({ id: 99, label: 'Another workspace command' });
    await view.deletion.request(); view.render();
    expect(view.dialog()!.querySelector<HTMLButtonElement>('.v1-modal__footer .v1-btn--danger')!.disabled).toBe(true);
    await view.deletion.confirm(); expect(view.deleteReport).not.toHaveBeenCalled();
    view.store.clearPending(99); view.render();
    expect(view.dialog()!.querySelector<HTMLButtonElement>('.v1-modal__footer .v1-btn--danger')!.disabled).toBe(false);
    view.deletion.cancel();
  });

  it('recovers committed publication and retries failed navigation without replaying deletion', async () => {
    const view = await setup(scope);
    const navigate = vi.spyOn(view.router, 'navigate').mockResolvedValueOnce(false).mockResolvedValue(true);
    const session = view.page.workbench.session()!, stage = session.mountedStage;
    view.editor.name.setValue(''); await view.deletion.request();
    view.deleteReport.mockRejectedValueOnce(new WorkspaceWriteError('persistence-failed', 'Publication failed', undefined, true));
    await view.deletion.confirm(); view.render();
    expect(view.deletion.committed()).toBe(true); expect(view.dialog()?.textContent).toContain('The report was deleted');
    expect(view.dialog()?.querySelector('.v1-modal__footer .v1-btn--quiet')).toBeNull();
    view.deletion.cancel(); expect(view.deletion.session()).toBeDefined();
    expect(navigate).not.toHaveBeenCalled(); expect(await view.editor.flush()).toBe(false);
    view.recover.mockRejectedValueOnce(new Error('Refresh failed'));
    await view.deletion.confirm(); expect(navigate).not.toHaveBeenCalled();
    view.recover.mockImplementationOnce(async () => {
      const collection = scope === 'account' ? 'accountReports' : 'facilityReports';
      const report = view.store[collection]()[0];
      view.store.publishCommittedPatch({ collections: [{ collection, deleteIds: [report.id!] }] }); view.render();
      expect(view.page.workbench.session()).toBe(session); expect(session.mountedStage).toBe(stage);
      expect(stage?.hostView.destroyed).toBe(false);
    });
    await view.deletion.confirm(); view.render();
    expect(view.dialog()?.textContent).toContain('Try returning to Reports again');
    expect(view.page.workbench.session()).toBe(session); expect(stage?.hostView.destroyed).toBe(false);
    await view.deletion.confirm(); view.render();
    expect(view.recover).toHaveBeenCalledTimes(2); expect(view.deleteReport).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it('replaces Setup with the owner dashboard and drops transient return parameters', async () => {
    const view = await setup(scope);
    const setupUrl = view.router.url;
    await view.router.navigateByUrl(`${setupUrl}?returnToReport=old&analysisOrigin=old`);
    view.editor.name.setValue(''); await view.deletion.request();
    await view.deletion.confirm(); view.render();
    expect(view.router.url).toBe('/v1/workspace/account/account-a/reports/dashboard' + (scope === 'facility' ? '?facility=facility-a' : ''));
    expect(view.harness.routeNativeElement?.textContent).toContain('Owning Reports dashboard');
    expect(view.page.workbench.session()).toBeUndefined();
  });

  it('releases a deleted session if an external navigation changes to an unavailable report', async () => {
    const view = await setup(scope);
    vi.spyOn(view.router, 'navigate').mockResolvedValue(false);
    await view.deletion.request(); await view.deletion.confirm(); view.render();
    const session = view.page.workbench.session()!;
    expect(view.deletion.committed()).toBe(true);
    await view.router.navigateByUrl(view.router.url.replace(scope === 'account' ? 'account-report/' : 'report-a/', 'missing/'));
    view.render();
    expect(view.page.workbench.session()).toBeUndefined(); expect(session.mountedStage).toBeUndefined();
    expect(view.dialog()).toBeNull(); expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
    await view.deletion.confirm(); expect(view.deleteReport).toHaveBeenCalledOnce();
  });

  it('releases only its own portal after an owner change and rejects stale confirmation', async () => {
    const view = await setup(scope);
    await view.deletion.request(); view.render();
    // A different owner takes the shell portal; the obsolete workflow cannot hide it.
    const otherPortal = new ComponentPortal(DashboardDestination);
    TestBed.inject(ModalPortalService).show(otherPortal);
    const snapshot = view.store.snapshot()!;
    view.store.publish({ ...snapshot, account: { ...snapshot.account, guid: 'other-account' } });
    view.harness.detectChanges();
    await view.deletion.confirm();
    expect(view.deleteReport).not.toHaveBeenCalled();
    expect(TestBed.inject(ModalPortalService).activePortal()).toBe(otherPortal);
    TestBed.inject(ModalPortalService).hide();
  });
});

describe('Setup deletion coverage and submitted writes', () => {
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); vi.useRealTimers(); });

  it.each(ACCOUNT_REPORT_TYPES)('offers exactly one action below the $value account editor', async ({ value }) => {
    const snapshot = accountReportSnapshot(); snapshot.accountReports[0].reportType = value;
    const view = await setupAccountReportWorkbench(snapshot); await view.open();
    expect(view.harness.routeNativeElement!.querySelectorAll('main > app-report-setup-delete button')).toHaveLength(1);
    expect(view.harness.routeNativeElement!.querySelector('main')!.lastElementChild!.tagName).toBe('APP-REPORT-SETUP-DELETE');
    await view.open('account-report', 'report');
    expect(view.harness.routeNativeElement!.querySelector('app-report-setup-delete')).toBeNull();
  });

  it.each(FACILITY_REPORT_TYPES)('offers exactly one action below the $value facility editor', async ({ value }) => {
    const view = await setupReportWorkbench([reportFixture({ facilityReportType: value })]); await view.open();
    expect(view.harness.routeNativeElement!.querySelectorAll('main > app-report-setup-delete button')).toHaveLength(1);
  });

  it('drains a submitted save, cancels its queued follow-up, and confirms the saved name', async () => {
    TestBed.configureTestingModule({ imports: [DeletePortalHost] });
    const view = await setupAccountReportWorkbench(); const page = await view.open();
    const deletion = view.harness.routeDebugElement!.query(By.directive(ReportSetupDeleteComponent)).componentInstance as ReportSetupDeleteComponent;
    let finish!: () => void;
    const persist = view.updateSetup.getMockImplementation()!;
    view.updateSetup.mockImplementationOnce((guid, changes) => new Promise(resolve => { finish = () => { void persist(guid, changes).then(resolve); }; }));
    page.editor.name.setValue('Submitted name'); const saving = page.editor.flush();
    page.editor.name.setValue('Newer unsaved draft');
    const preparing = deletion.request(); view.harness.detectChanges();
    expect(deletion.busy()).toBe(true); expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
    expect(await page.workbench.flush()).toBe(false);
    finish(); await saving; await preparing; view.harness.detectChanges();
    expect(deletion.session()?.reportName).toBe('Submitted name');
    expect(page.editor.name.value).toBe('Newer unsaved draft'); expect(view.updateSetup).toHaveBeenCalledOnce();
    deletion.cancel(); expect(await page.editor.flush()).toBe(true);
    expect(view.store.accountReports()[0].name).toBe('Newer unsaved draft');
  });

  it('rejects a late preparation after the account changes while a submitted save drains', async () => {
    const view = await setupAccountReportWorkbench(); const page = await view.open();
    const deletion = view.harness.routeDebugElement!.query(By.directive(ReportSetupDeleteComponent)).componentInstance as ReportSetupDeleteComponent;
    const original = view.store.accountReports()[0]; let finish!: () => void;
    view.updateSetup.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve({ ...original, name: 'Old submitted name' }); }));
    page.editor.name.setValue('Old submitted name'); const saving = page.editor.flush(), preparing = deletion.request();
    const snapshot = view.store.snapshot()!;
    view.store.publish({ ...snapshot, account: { ...snapshot.account, guid: 'other-account' }, accountReports: [] });
    view.harness.detectChanges(); finish(); await saving; await preparing; view.harness.detectChanges();
    expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
    await deletion.confirm(); expect(view.deleteReport).not.toHaveBeenCalled();
    expect(view.store.account()?.guid).toBe('other-account'); expect(view.store.accountReports()).toEqual([]);
  });

  it('rejects confirmation after the selected facility changes within the same account', async () => {
    const view = await setup('facility'); await view.deletion.request(); view.render();
    view.store.selectFacility(undefined); view.render();
    await view.deletion.confirm();
    expect(view.deleteReport).not.toHaveBeenCalled(); expect(view.dialog()).toBeNull();
  });
});

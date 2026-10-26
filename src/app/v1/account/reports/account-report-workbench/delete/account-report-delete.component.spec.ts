import { PortalModule } from '@angular/cdk/portal';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { REPORT_AUTOSAVE_DEBOUNCE_MS } from '@app/v1/shared/reports/report-autosave-controller';
import { setupAccountReportWorkbench } from '../../testing/account-report-workbench-test-setup';
import { AccountReportDeleteService } from './account-report-delete.service';

@Component({ standalone: true, imports: [PortalModule], template: '<ng-template [cdkPortalOutlet]="modal.activePortal()"/>' })
class DeletePortalHost { readonly modal = inject(ModalPortalService); }

async function setup() {
  TestBed.configureTestingModule({ imports: [DeletePortalHost] });
  const view = await setupAccountReportWorkbench();
  const workbench = await view.open();
  const portal = TestBed.createComponent(DeletePortalHost); portal.detectChanges();
  const deletion = view.harness.routeDebugElement!.injector.get(AccountReportDeleteService);
  const button = view.harness.routeNativeElement!.querySelector<HTMLButtonElement>('app-account-report-delete button')!;
  const render = () => { view.harness.detectChanges(); portal.detectChanges(); };
  const dialog = () => portal.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
  return { ...view, workbench, deletion, button, portal, render, dialog };
}

describe('delete report from Setup', () => {
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });

  it('places the action last, pauses autosave during confirmation, and preserves a canceled draft', async () => {
    const view = await setup(); vi.useFakeTimers();
    const section = view.harness.routeNativeElement!.querySelector('[aria-label="Report setup"]')!;
    expect(section.lastElementChild?.tagName).toBe('APP-ACCOUNT-REPORT-DELETE');
    view.workbench.editor.form.controls.name.setValue('Unsaved report');
    view.button.click(); view.render();
    expect(view.dialog().textContent).toContain('Saved account report');
    await vi.advanceTimersByTimeAsync(REPORT_AUTOSAVE_DEBOUNCE_MS + 1);
    expect(view.updateSetup).not.toHaveBeenCalled(); expect(view.deleteReport).not.toHaveBeenCalled();
    view.dialog().querySelector<HTMLButtonElement>('[aria-label="Cancel report deletion"]')!.click(); view.render();
    expect(view.dialog()).toBeNull();
    expect(view.workbench.editor.form.controls.name.value).toBe('Unsaved report');
    expect(await view.workbench.editor.flush()).toBe(true);
    expect(view.updateSetup).toHaveBeenCalledWith('account-report', { name: 'Unsaved report' });
  });

  it('retains an invalid draft on delete failure, then deletes only the report and returns to the dashboard after retry', async () => {
    const view = await setup();
    const analyses = view.store.accountAnalyses(), facilityAnalyses = view.store.facilityAnalyses();
    const navigate = vi.spyOn(view.router, 'navigate').mockResolvedValue(true);
    view.workbench.editor.form.controls.name.setValue(''); view.render();
    expect(view.button.disabled).toBe(false);
    view.button.click(); view.render();
    view.deleteReport.mockRejectedValueOnce(new Error('Disk full'));
    await view.deletion.confirm(); view.render();
    expect(view.dialog().textContent).toContain('Disk full');
    expect(view.workbench.editor.form.controls.name.value).toBe('');
    expect(view.store.accountReports()).toHaveLength(1); expect(navigate).not.toHaveBeenCalled();
    await view.deletion.confirm(); view.render();
    expect(view.deleteReport).toHaveBeenCalledTimes(2);
    expect(view.deleteReport).toHaveBeenLastCalledWith('account-report');
    expect(view.store.accountReports()).toHaveLength(0);
    expect(view.store.accountAnalyses()).toEqual(analyses); expect(view.store.facilityAnalyses()).toEqual(facilityAnalyses);
    expect(view.updateSetup).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'account', 'account-a', 'reports', 'dashboard']);
    expect(await view.workbench.editor.flush()).toBe(true);
  });

  it('disables duplicate confirmation while deletion is pending and blocks deletion for a stale report identity', async () => {
    const view = await setup();
    vi.spyOn(view.router, 'navigate').mockResolvedValue(true);
    let finish!: () => void;
    view.deleteReport.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    view.button.click(); view.render();
    const deleting = view.deletion.confirm(); view.render();
    expect([...view.dialog().querySelectorAll<HTMLButtonElement>('button')].every(button => button.disabled)).toBe(true);
    await view.deletion.confirm(); view.deletion.cancel();
    expect(view.deleteReport).toHaveBeenCalledOnce();
    finish(); await deleting; view.render();
    view.button.click(); view.render();
    const snapshot = view.store.snapshot()!;
    view.store.publish({ ...snapshot, account: { ...snapshot.account, guid: 'other-account' } });
    await view.deletion.confirm();
    expect(view.deleteReport).toHaveBeenCalledOnce();
  });
});

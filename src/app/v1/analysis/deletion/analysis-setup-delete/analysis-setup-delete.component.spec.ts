import { signal } from '@angular/core';
import { analysisSetupDeletionGuard } from '../analysis-setup-deletion.guard';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { TestBed } from '@angular/core/testing';
import { TemplatePortal } from '@angular/cdk/portal';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { setupDeletion } from './analysis-setup-delete.testing';

afterEach(() => TestBed.resetTestingModule());

describe.each(['account', 'facility'] as const)('%s Setup deletion', scope => {
  it('opens a named confirmation and cancelling preserves unsaved edits', async () => {
    const view = setupDeletion(scope);
    view.opener().click(); await view.settle();
    expect(view.root.querySelector('[role=dialog]')?.textContent).toContain(`Saved ${scope} analysis`);
    expect(view.root.querySelector('[role=dialog]')?.textContent).toContain(scope === 'account' ? 'Company' : 'Plant');
    expect(view.host.editor.beginDeletion).toHaveBeenCalledTimes(1);
    view.cancel().click(); await view.settle();
    expect(view.host.editor.cancelDeletion).toHaveBeenCalledTimes(1);
    expect(view.host.editor.isDirty()).toBe(true);
    expect(view.accountActions.deleteAnalysis).not.toHaveBeenCalled();
    expect(view.facilityActions.deleteAnalysis).not.toHaveBeenCalled();
    expect(view.root.querySelector('[role=dialog]')).toBeNull();
  });

  it('deletes once and replaces Setup with the owning dashboard', async () => {
    const view = setupDeletion(scope);
    const actions = scope === 'account' ? view.accountActions : view.facilityActions;
    view.navigate.mockImplementation(async () => TestBed.inject(UnsavedChangesService).resolveNavigationPreflight());
    let finish!: () => void;
    actions.deleteAnalysis.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve(undefined); }));
    view.opener().click(); await view.settle();
    view.confirm().click(); view.confirm().click(); view.fixture.detectChanges();
    expect(actions.deleteAnalysis).toHaveBeenCalledTimes(1);
    expect(view.confirm().disabled).toBe(true);
    view.control.cancel(); expect(view.host.editor.cancelDeletion).not.toHaveBeenCalled();
    finish(); await view.settle();
    expect(actions.deleteAnalysis.mock.calls[0]).toEqual(scope === 'account' ? ['analysis'] : ['analysis', 'facility']);
    expect(view.host.editor.completeDeletion).toHaveBeenCalled();
    expect(view.navigate).toHaveBeenCalledWith(['/analyses'], { replaceUrl: true, queryParams: scope === 'account' ? {} : { facility: 'facility' } });
  });

  it('disables confirmation for a linked report and updates when the blocker is removed', async () => {
    const view = setupDeletion(scope);
    const data = view.snapshot();
    view.snapshot.set({ ...data, [scope === 'account' ? 'accountReports' : 'facilityReports']: [scope === 'account' ? { reportType: 'analysis', analysisReportSetup: { analysisItemId: 'analysis' } } : { analysisItemId: 'analysis' }] });
    view.opener().click(); await view.settle();
    expect(view.confirm().disabled).toBe(true);
    expect(view.root.querySelector('[role=alert]')?.textContent).toContain('linked');
    view.snapshot.set(data); await view.settle();
    expect(view.confirm().disabled).toBe(false);
  });

  it('retains the modal after a persistence failure and permits retry', async () => {
    const view = setupDeletion(scope);
    const actions = scope === 'account' ? view.accountActions : view.facilityActions;
    actions.deleteAnalysis.mockRejectedValueOnce(new Error('Disk unavailable'));
    view.opener().click(); await view.settle();
    view.confirm().click(); await view.settle();
    expect(view.root.querySelector('[role=alert]')?.textContent).toContain('Disk unavailable');
    expect(view.host.editor.completeDeletion).not.toHaveBeenCalled();
    expect(view.navigate).not.toHaveBeenCalled();
    view.confirm().click(); await view.settle();
    expect(actions.deleteAnalysis).toHaveBeenCalledTimes(2);
    expect(view.navigate).toHaveBeenCalledTimes(1);
  });

  it('repairs publication after a committed failure without repeating deletion or resuming autosave', async () => {
    const view = setupDeletion(scope);
    const actions = scope === 'account' ? view.accountActions : view.facilityActions;
    actions.deleteAnalysis.mockRejectedValueOnce(new WorkspaceWriteError('persistence-failed', 'Refresh failed', undefined, true));
    view.recover.mockRejectedValueOnce(new Error('Still unavailable'));
    view.opener().click(); await view.settle();
    view.confirm().click(); await view.settle();
    expect(view.cancel()).toBeNull();
    view.control.cancel(); expect(view.host.editor.cancelDeletion).not.toHaveBeenCalled();
    view.confirm().click(); await view.settle();
    expect(view.host.editor.completeDeletion).not.toHaveBeenCalled();
    view.confirm().click(); await view.settle();
    expect(view.recover).toHaveBeenCalledTimes(2);
    expect(view.recover).toHaveBeenCalledWith('account');
    expect(actions.deleteAnalysis).toHaveBeenCalledTimes(1);
    expect(view.navigate).toHaveBeenCalledTimes(1);
  });
});

describe('deletion session ownership', () => {
  it('blocks stage changes and account switches for the complete deletion session', async () => {
    const held = signal(false);
    const view = setupDeletion();
    const guard = () => TestBed.runInInjectionContext(() => analysisSetupDeletionGuard({ autosave: { deletionHeld: held } }, null!, null!, null!));
    view.host.editor.beginDeletion.mockImplementation(async () => { held.set(true); return true; });
    view.host.editor.cancelDeletion.mockImplementation(() => { held.set(false); });
    const navigation = TestBed.inject(UnsavedChangesService);
    expect(guard()).toBe(true);
    expect(await navigation.resolveNavigationPreflight()).toBe(true);
    view.opener().click(); await view.settle();
    expect(guard()).toBe(false);
    expect(await navigation.resolveNavigationPreflight()).toBe(false);
    view.cancel().click(); await view.settle();
    expect(guard()).toBe(true);
    expect(await navigation.resolveNavigationPreflight()).toBe(true);
  });

  it('offers no delete action for an analysis outside the routed facility', async () => {
    const view = setupDeletion();
    view.snapshot.update(data => ({ ...data, facilities: [{ ...data.facilities[0], guid: 'other-facility' }] }));
    await view.settle();
    expect(view.opener()).toBeNull();
    await view.control.requestDelete();
    expect(view.host.editor.beginDeletion).not.toHaveBeenCalled();
  });

  it.each([false, true])('can return after navigation fails without repeating deletion (rejected=%s)', async rejected => {
    const view = setupDeletion();
    if (rejected) view.navigate.mockRejectedValueOnce(new Error('Navigation failed'));
    else view.navigate.mockResolvedValueOnce(false);
    view.opener().click(); await view.settle();
    view.confirm().click(); await view.settle();
    expect(view.root.querySelector('[role=dialog]')).not.toBeNull();
    expect(view.cancel()).toBeNull();
    await vi.waitFor(() => { view.fixture.detectChanges(); expect(view.confirm().disabled).toBe(false); });
    view.confirm().click(); await view.settle();
    expect(view.facilityActions.deleteAnalysis).toHaveBeenCalledTimes(1);
    expect(view.recover).not.toHaveBeenCalled();
    expect(view.navigate).toHaveBeenCalledTimes(2);
  });

  it('waits for preparation, rejects duplicate opens, and ignores a departed analysis', async () => {
    const view = setupDeletion();
    let ready!: (value: boolean) => void;
    view.host.editor.beginDeletion.mockImplementationOnce(() => new Promise(resolve => { ready = resolve; }));
    view.pending.set(true); view.fixture.detectChanges();
    const preparation = view.control.requestDelete();
    await view.control.requestDelete();
    expect(view.host.editor.beginDeletion).toHaveBeenCalledTimes(1);
    expect(view.root.querySelector('[role=dialog]')).toBeNull();
    view.host.guid.set('other'); view.fixture.detectChanges();
    ready(true); await preparation; await view.settle();
    expect(view.root.querySelector('[role=dialog]')).toBeNull();
    expect(view.host.editor.cancelDeletion).toHaveBeenCalledTimes(1);
  });

  it('does not close a portal opened by another feature during teardown', async () => {
    const view = setupDeletion();
    view.opener().click(); await view.settle();
    const modal = TestBed.inject(ModalPortalService);
    const other = {} as TemplatePortal;
    modal.show(other); // Keep it unrendered; this test verifies portal ownership only.
    view.fixture.destroy();
    expect(modal.activePortal()).toBe(other);
  });

  it('ignores a delete completion after the active account changes', async () => {
    const view = setupDeletion();
    let finish!: () => void;
    view.facilityActions.deleteAnalysis.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve(undefined); }));
    view.opener().click(); await view.settle();
    const deletion = view.control.confirmDelete();
    view.snapshot.update(data => ({ ...data, account: { ...data.account, guid: 'other' } }));
    view.fixture.detectChanges(); finish(); await deletion;
    expect(view.navigate).not.toHaveBeenCalled();
  });
});

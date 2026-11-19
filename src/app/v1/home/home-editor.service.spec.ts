import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { HomeCommands } from '@data/account-workspace/home-commands.service';
import { HomeCommand, HomeConflictError } from '@data/account-workspace/home-commands.models';
import { getNewIdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { homeAccountOwner, homeOwnerState } from '@domain/home/testing/home-fixtures';
import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { HomeEditor } from './home-editor.service';
import { homeRecord, setupHome } from './testing/home-testing';

function setupEditor() {
  const state = setupHome(), record = homeRecord('a', 'Original');
  const owner = getNewIdbHomeOwner('account-a', homeAccountOwner, homeOwnerState(['a']));
  state.store.publish({ ...state.snapshot, homeDashboards: [record], homeOwners: [owner] });
  state.route.set(parseWorkspaceRoute('/v1/workspace/account/account-a/home/dashboard/a'));
  const commands = TestBed.inject(HomeCommands), editor = TestBed.inject(HomeEditor);
  const submit = vi.spyOn(commands, 'submit').mockImplementation(async command => ({ state: 'failed', command, error: new Error('Write rejected') }));
  TestBed.tick();
  return { ...state, commands, editor, submit, record, owner };
}
function nameDraft(editor: HomeEditor, name: string) { editor.beginEdit(); TestBed.tick(); editor.form.controls.name.setValue(name); }

describe('Home protected lifecycle drafts', () => {
  afterEach(() => vi.restoreAllMocks());
  it('retains a rejected update and retries the exact operation, proposal and captured revisions', async () => {
    const { editor, submit, record, owner } = setupEditor();
    nameDraft(editor, 'My draft'); await editor.save();
    const proposal = editor.session()!.proposal!;
    expect(proposal).toMatchObject({ kind: 'update', expectedRevision: record.revision, expectedOwnerRevision: owner.revision, definition: { name: 'My draft' } });
    expect(editor.session()?.definition?.name).toBe('My draft');
    editor.form.controls.name.setValue('Cannot replace locked proposal');
    expect(editor.session()?.definition?.name).toBe('My draft');
    await editor.retry();
    expect(submit.mock.calls[1][0]).toBe(proposal);
    expect(editor.needsProtection()).toBe(true);
  });
  it('creates Blank with a stable identity and no charts, retaining its form after rejection', async () => {
    const { editor, submit } = setupEditor();
    editor.beginCreate(); TestBed.tick(); editor.form.controls.name.setValue('Blank board'); await editor.save();
    const command = submit.mock.calls[0][0]; expect(command.kind).toBe('create');
    if (command.kind !== 'create') throw new Error('Expected create');
    expect(command.graph.charts).toEqual([]); expect(command.graph.dashboards[0].definition.widgets).toEqual([]);
    await editor.retry(); expect(submit.mock.calls[1][0]).toBe(command);
    expect(editor.session()?.definition?.name).toBe('Blank board');
  });
  it('blocks save duplicates and edits while a command is running', async () => {
    const { editor, submit } = setupEditor();
    let done!: (value: Awaited<ReturnType<HomeCommands['submit']>>) => void;
    submit.mockImplementation(command => new Promise(resolve => { done = resolve; }));
    nameDraft(editor, 'Pending'); const first = editor.save(); await editor.save();
    expect(submit).toHaveBeenCalledTimes(1); expect(editor.saving()).toBe(true);
    expect(await editor.resolveLeave()).toBe(false);
    const command = submit.mock.calls[0][0]; done({ state: 'failed', command, error: new Error('No write') }); await first;
    expect(editor.session()?.definition?.name).toBe('Pending');
  });
  it('uses publication-only recovery, preserving the receipt across a departed owner and never navigating on recovery', async () => {
    const { editor, submit, commands, route } = setupEditor();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    submit.mockImplementation(async command => ({ state: 'refresh-required', command, error: new Error('Refresh failed') }));
    const recover = vi.spyOn(commands, 'recover').mockResolvedValue();
    nameDraft(editor, 'Committed draft'); await editor.save();
    const command = editor.session()!.proposal!;
    const leave = editor.resolveLeave(); await editor.confirm(); expect(await leave).toBe(true);
    route.set(parseWorkspaceRoute('/v1/workspace/facility/facility-a/home/overview')); TestBed.tick();
    expect(editor.session()?.proposal).toBeUndefined();
    route.set(parseWorkspaceRoute('/v1/workspace/account/account-a/home/dashboard/a')); TestBed.tick();
    expect(editor.session()?.proposal).toBe(command);
    await editor.retry();
    expect(recover).toHaveBeenCalledWith('account-a', command.operationGuid);
    expect(submit).toHaveBeenCalledTimes(1); expect(navigate).not.toHaveBeenCalled(); expect(editor.needsProtection()).toBe(false);
  });
  it('keeps a receipt departure acknowledgement across guards and invalidates it after canceled navigation', async () => {
    const { editor, submit } = setupEditor();
    submit.mockImplementation(async command => ({ state: 'refresh-required', command, error: new Error('Refresh failed') }));
    nameDraft(editor, 'Saved draft'); await editor.save();
    const leave = editor.resolveLeave(); await editor.confirm(); expect(await leave).toBe(true);
    expect(await editor.resolveLeave()).toBe(true); expect(editor.needsProtection()).toBe(false);
    expect(editor.canStart()).toBe(false); expect(editor.session()?.proposal).toBeDefined();
    const router = TestBed.inject(Router);
    router.resetConfig([{ path: 'blocked', canActivate: [() => false], children: [] }]);
    expect(await router.navigateByUrl('/blocked')).toBe(false);
    expect(editor.needsProtection()).toBe(true);
  });
  it('guards leave choices against newer edits and preserves canceled drafts', async () => {
    const { editor } = setupEditor(); nameDraft(editor, 'Protected');
    const leaving = editor.resolveLeave(); editor.cancelConfirmation(); expect(await leaving).toBe(false);
    expect(editor.session()?.definition?.name).toBe('Protected');
    const stale = editor.resolveLeave(); editor.form.controls.name.setValue('Newer draft'); await editor.confirm();
    expect(await stale).toBe(false); expect(editor.session()?.definition?.name).toBe('Newer draft');
    const confirmed = editor.resolveLeave(); await editor.confirm(); expect(await confirmed).toBe(true);
    expect(editor.needsProtection()).toBe(false);
  });
  it('loads conflicts without discarding drafts, then prepares against explicitly reviewed revisions', async () => {
    const { editor, submit, record, owner, store, snapshot } = setupEditor();
    const current = { ...record, revision: 2, definition: { ...record.definition as object, name: 'Concurrent' } };
    submit.mockImplementation(async command => ({ state: 'conflict', command, error: new HomeConflictError({ ...owner, revision: 2 }, current) }));
    nameDraft(editor, 'Local'); await editor.save(); expect(editor.canRetry()).toBe(false);
    vi.spyOn(TestBed.inject(AccountWorkspaceService), 'reloadActiveWorkspace').mockImplementation(async () => {
      store.publish({ ...snapshot, homeDashboards: [current], homeOwners: [{ ...owner, revision: 2 }] }); return 'published';
    });
    await editor.loadConflict(); expect(editor.session()?.definition?.name).toBe('Local');
    editor.keepReviewedDraft(); expect(editor.session()?.proposal).toBeUndefined();
    await editor.save(); expect(submit.mock.calls[1][0]).toMatchObject({ kind: 'update', expectedRevision: 2, expectedOwnerRevision: 2, definition: { name: 'Local' } });
  });
  it('requires another review when saved revisions change after loading the conflict', async () => {
    const { editor, submit, record, owner, store, snapshot } = setupEditor();
    submit.mockImplementation(async command => ({ state: 'conflict', command, error: new HomeConflictError(owner, record) }));
    nameDraft(editor, 'Local'); await editor.save(); await editor.loadConflict();
    store.publish({ ...snapshot, homeDashboards: [{ ...record, revision: 3 }], homeOwners: [{ ...owner, revision: 3 }] });
    editor.keepReviewedDraft();
    expect(editor.session()?.outcome?.state).toBe('conflict'); expect(editor.session()?.conflictLoaded).toBe(false);
    expect(editor.session()?.definition?.name).toBe('Local');
  });
  it('does not navigate after a creation completes in a departed view', async () => {
    const { editor, submit, owner } = setupEditor();
    const release = editor.attach(), navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    let finish!: (value: Awaited<ReturnType<HomeCommands['submit']>>) => void;
    submit.mockImplementation(() => new Promise(resolve => finish = resolve));
    editor.beginCreate(); TestBed.tick(); editor.form.controls.name.setValue('Late creation');
    const saving = editor.save(), command = submit.mock.calls[0][0]; release();
    finish({ state: 'committed', command, value: { owner, dashboard: homeRecord('new'), changed: true } }); await saving;
    expect(navigate).not.toHaveBeenCalled(); expect(editor.session()?.proposal).toBeUndefined();
  });
  it('acknowledges only an explicitly selected blocked default, leaving ordinary choices without repair paths', async () => {
    const { editor, submit, store, snapshot, owner, record } = setupEditor();
    await editor.setDefault('a'); expect(submit.mock.calls[0][0]).not.toHaveProperty('repairPaths');
    editor.discard();
    store.publish({ ...snapshot, homeDashboards: [record], homeOwners: [{ ...owner, preservation: { references: [
      { path: 'defaultDashboardGuid', kind: 'dashboard', guid: 'a', reason: 'not-transferred' }
    ], transfers: [] } }] });
    await editor.setDefault('a'); expect(submit.mock.calls[1][0]).toHaveProperty('repairPaths', ['defaultDashboardGuid']);
  });
  it('does not silently rebase a draft onto a dashboard with changed ownership', async () => {
    const { editor, submit, record, owner, store, snapshot } = setupEditor();
    submit.mockImplementation(async command => ({ state: 'conflict', command, error: new HomeConflictError(owner) }));
    nameDraft(editor, 'Local'); await editor.save();
    vi.spyOn(TestBed.inject(AccountWorkspaceService), 'reloadActiveWorkspace').mockImplementation(async () => {
      store.publish({ ...snapshot, homeDashboards: [{ ...record, facilityId: 'facility-a' }], homeOwners: [owner] }); return 'published';
    });
    await editor.loadConflict(); editor.keepReviewedDraft();
    expect(editor.session()?.outcome?.state).toBe('conflict'); expect(editor.session()?.definition?.name).toBe('Local');
  });
  it('preserves unavailable default and order preferences when only reordering visible dashboards', async () => {
    const { editor, submit, store, snapshot, owner, record } = setupEditor();
    store.publish({ ...snapshot, homeDashboards: [record, homeRecord('b')], homeOwners: [{ ...owner,
      state: { ...homeOwnerState(['missing', 'a', 'b']), defaultDashboardGuid: 'missing' },
      preservation: { references: [{ path: 'defaultDashboardGuid', kind: 'dashboard', guid: 'missing', reason: 'not-transferred' }], transfers: [] } }] });
    await editor.moveDashboard('b', -1);
    expect(submit.mock.calls[0][0]).toMatchObject({ kind: 'configure', state: { dashboardOrder: ['missing', 'b', 'a'], defaultDashboardGuid: 'missing' } });
    expect(submit.mock.calls[0][0]).not.toHaveProperty('repairPaths');
  });
  it('requires a named delete confirmation and restores only through the available complete recipe boundary', async () => {
    const { editor, submit, record } = setupEditor();
    editor.requestDelete(); expect(submit).not.toHaveBeenCalled(); expect(editor.confirmation()?.title).toContain('Original');
    editor.cancelConfirmation(); editor.beginRestore(); TestBed.tick(); editor.requestRestore();
    const confirmation = editor.confirmation()!;
    expect(confirmation.detail).toContain('every former chart will remain');
    expect(confirmation.command).toMatchObject({ kind: 'restore', guid: record.guid, graph: { charts: [], dashboards: [{ definition: { name: 'Blank', widgets: [] } }] } });
    await editor.confirm(); expect(submit).toHaveBeenCalledTimes(1);
  });
  it('does not adopt or initialize an empty owner on entry, and explicitly adopts imported nonempty sets', async () => {
    const { editor, submit, store, snapshot, record } = setupEditor();
    store.publish(snapshot); TestBed.tick(); expect(submit).not.toHaveBeenCalled(); await editor.adopt(); expect(submit).not.toHaveBeenCalled();
    store.publish({ ...snapshot, homeDashboards: [record] }); await editor.adopt();
    expect(submit.mock.calls[0][0]).toMatchObject({ kind: 'initialize', graph: { dashboards: [], charts: [] } });
  });
});

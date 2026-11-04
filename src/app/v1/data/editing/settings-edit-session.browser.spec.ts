import { Component, computed, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Subject } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { HasUnsavedChanges, unsavedChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { EditorConflictError, reconcileFields } from './draft-reconciliation';
import { EditSaveMode, injectSettingsEditSession } from './settings-edit-session';

interface SettingsValues { name: string; }
const ACCOUNT_GUID = 'native-settings-account';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: '<form [formGroup]="form"><label>Account name<input formControlName="name"/></label></form>'
})
class NativeSettingsEditHost implements HasUnsavedChanges {
  private readonly store = inject(AccountWorkspaceStore);
  private readonly handler = inject(AccountCommandHandler);
  private readonly transactions = inject(IndexedDbTransactionService);
  private readonly boundary = inject(WorkspaceCommandBoundary);
  private readonly changes = new Subject<EditSaveMode>();
  readonly form = new FormGroup({ name: new FormControl('', { nonNullable: true, validators: Validators.required }) });
  readonly workspaceReads: string[] = [];
  readonly workspaceRevisionReads: { revision: number; committedRevision: number | undefined; owners: readonly (string | undefined)[] }[] = [];
  abortBeforeCommit = false;
  readonly session = injectSettingsEditSession<SettingsValues>({
    key: computed(() => this.store.account()?.guid ?? ''),
    saved: computed(() => { const account = this.store.account(); return account ? { name: account.name } : undefined; }),
    canWrite: this.store.canWrite,
    pendingOwners: computed(() => this.store.pendingOperations().map(operation => operation.ownerId)),
    changes: this.changes,
    read: () => this.form.getRawValue(),
    hydrate: value => this.form.reset(value ?? { name: '' }, { emitEvent: false }),
    normalize: value => ({ name: value.name.trim() }),
    valid: () => this.form.valid,
    reconcile: (base, local, saved, choices) => reconcileFields(base, local, saved, { choices }),
    persist: async (value, base, ownerId) => {
      const result = await this.boundary.execute({ entityKind: 'account', changeKind: 'update', entityGuid: ACCOUNT_GUID,
        label: 'Saving native settings', ownerId, publication: { mode: 'reload' }
      }, async () => {
        const current = this.store.account();
        if (!current) throw new Error('The saved account is missing.');
        this.workspaceReads.push(current.name);
        this.workspaceRevisionReads.push({ revision: this.store.revision(), committedRevision: this.store.committedRevision()?.revision,
          owners: this.store.pendingOperations().map(operation => operation.ownerId) });
        const merged = reconcileFields(base, value, { name: current.name });
        if (merged.conflicts.length) throw new EditorConflictError({ name: current.name });
        const updated = { ...current, ...merged.value };
        if (this.abortBeforeCommit) {
          await this.transactions.runTransaction(['accounts'], 'readwrite', async transaction => {
            await transaction.put('accounts', updated);
            throw new Error('Abort the native transaction before commit.');
          });
        }
        const persisted = await this.handler.update(updated, ACCOUNT_GUID);
        return { name: persisted.name };
      });
      return result.value;
    },
    setEnabled: enabled => enabled ? this.form.enable({ emitEvent: false }) : this.form.disable({ emitEvent: false })
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.changes.next('debounced'));
  }
  hasUnsavedChanges(): boolean { return this.session.dirty(); }
  isNavigationBlocked(): boolean { return this.session.saving(); }
}

describe('Settings session publication failure with native IndexedDB', () => {
  let harness: IndexedDbTestHarness;
  let fixture: ComponentFixture<NativeSettingsEditHost> | undefined;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [NativeSettingsEditHost], providers: [
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }
    ] });
    harness = await IndexedDbTestHarness.create('settings-session-publication');
    await harness.seed({ accounts: [{ ...getNewIdbAccount(), id: 1, guid: ACCOUNT_GUID, name: 'A' }] });
    const workspace = TestBed.inject(AccountWorkspaceService);
    await workspace.selectAccount(ACCOUNT_GUID);
    await workspace.reloadActiveWorkspace(true);
    fixture = TestBed.createComponent(NativeSettingsEditHost);
    fixture.detectChanges();
  });

  afterEach(async () => {
    fixture?.destroy(); fixture = undefined;
    vi.restoreAllMocks();
    await harness.destroy();
  });

  it.each(['A', 'B'])('protects a later draft of %s after persistence commits but reload fails, then retries against the repaired workspace', async intended => {
    const host = fixture!.componentInstance;
    const store = TestBed.inject(AccountWorkspaceStore);
    const unsaved = TestBed.inject(UnsavedChangesService);
    const priorRevision = store.revision();
    const priorCommitted = store.committedRevision();
    expect(priorRevision).toBeGreaterThan(0);
    expect(priorCommitted).toEqual({ accountGuid: ACCOUNT_GUID, revision: priorRevision });
    const reloadStarted = deferred<void>();
    const reload = deferred<Awaited<ReturnType<AccountWorkspaceService['reloadActiveWorkspace']>>>();
    const reloadWorkspace = vi.spyOn(TestBed.inject(AccountWorkspaceService), 'reloadActiveWorkspace').mockImplementationOnce(() => {
      reloadStarted.resolve(undefined);
      return reload.promise;
    });
    const update = vi.spyOn(TestBed.inject(AccountCommandHandler), 'update');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    host.form.controls.name.setValue('B');
    const saving = host.session.saveNow();
    try {
      await reloadStarted.promise;
      expect(await harness.getAll('accounts')).toEqual([expect.objectContaining({ guid: ACCOUNT_GUID, name: 'B' })]);
      expect(store.account()?.name).toBe('A');
      expect(store.pendingOperations()).toEqual([expect.objectContaining({ ownerId: host.session.ownerId })]);
      host.form.controls.name.setValue(intended);
      TestBed.tick();
      expect(host.session.saving()).toBe(true);
      expect(canLeave(host)).toBe(false);
      expect(confirm).not.toHaveBeenCalled();

      reload.reject(new Error('Workspace reload unavailable.'));
      await expect(saving).resolves.toBe(false);
      TestBed.tick();
      expect(host.form.controls.name.value).toBe(intended);
      expect(host.session.state()).toBe('error');
      expect(host.session.dirty()).toBe(true);
      expect(host.session.saving()).toBe(false);
      expect(unsaved.hasUnsavedChanges()).toBe(true);
      expect(canLeave(host)).toBe(false);
      expect(confirm).toHaveBeenCalledOnce();
      expect(unloadPrevented()).toBe(true);
      expect(store.account()?.name).toBe('A');
      expect(store.revision()).toBe(priorRevision);
      expect(store.committedRevision()).toEqual(priorCommitted);
      expect(await harness.getAll('accounts')).toEqual([expect.objectContaining({ guid: ACCOUNT_GUID, name: 'B' })]);

      host.session.retry();
      // Join the retry already in flight rather than starting a separate command.
      await expect(host.session.saveNow()).resolves.toBe(true);
      TestBed.tick();
      expect(host.workspaceReads).toEqual(['A', 'B']);
      expect(host.workspaceRevisionReads).toEqual([
        { revision: priorRevision, committedRevision: priorRevision, owners: [host.session.ownerId] },
        { revision: priorRevision + 1, committedRevision: priorRevision + 1, owners: [host.session.ownerId] }
      ]);
      expect(update).toHaveBeenCalledTimes(2);
      expect(reloadWorkspace).toHaveBeenCalledTimes(3);
      expect(reloadWorkspace.mock.calls.map(call => call[0] ?? false)).toEqual([true, true, true]);
      expect(store.account()?.name).toBe(intended);
      expect(store.account()?.guid).toBe(ACCOUNT_GUID);
      expect(store.revision()).toBe(priorRevision + 2);
      expect(store.committedRevision()).toEqual({ accountGuid: ACCOUNT_GUID, revision: priorRevision + 2 });
      expect(store.pendingOperations()).toEqual([]);
      expect(host.session.state()).toBe('saved');
      expect(host.session.dirty()).toBe(false);
      expect(unsaved.hasUnsavedChanges()).toBe(false);
      expect(canLeave(host)).toBe(true);
      expect(unloadPrevented()).toBe(false);
      fixture!.destroy(); fixture = undefined;
      await harness.reopen();
      expect(await harness.getAll('accounts')).toEqual([expect.objectContaining({ id: 1, guid: ACCOUNT_GUID, name: intended })]);
    } finally {
      reload.reject(new Error('Release the deferred reload during cleanup.'));
      await saving;
    }
  });

  it('retains protection and avoids another write when cache repair fails again before retry can execute', async () => {
    const host = fixture!.componentInstance;
    const store = TestBed.inject(AccountWorkspaceStore);
    const reload = vi.spyOn(TestBed.inject(AccountWorkspaceService), 'reloadActiveWorkspace')
      .mockRejectedValueOnce(new Error('Initial publication failed.'))
      .mockRejectedValueOnce(new Error('Cache repair is still unavailable.'));
    const update = vi.spyOn(TestBed.inject(AccountCommandHandler), 'update');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    host.form.controls.name.setValue('B');
    await expect(host.session.saveNow()).resolves.toBe(false);
    TestBed.tick();
    expect(host.session.dirty()).toBe(true);

    host.session.retry();
    await expect(host.session.saveNow()).resolves.toBe(false);
    TestBed.tick();
    expect(host.session.state()).toBe('error');
    expect(host.session.dirty()).toBe(true);
    expect(host.form.controls.name.value).toBe('B');
    expect(store.account()?.name).toBe('A');
    expect(host.workspaceReads).toEqual(['A']);
    expect(update).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledTimes(2);
    expect(canLeave(host)).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
    expect(unloadPrevented()).toBe(true);
    expect(await harness.getAll('accounts')).toEqual([expect.objectContaining({ guid: ACCOUNT_GUID, name: 'B' })]);

    host.session.retry();
    await expect(host.session.saveNow()).resolves.toBe(true);
    TestBed.tick();
    expect(host.workspaceReads).toEqual(['A', 'B']);
    expect(update).toHaveBeenCalledTimes(2);
    expect(reload).toHaveBeenCalledTimes(4);
    expect(store.account()?.name).toBe('B');
    expect(host.session.dirty()).toBe(false);
    expect(unloadPrevented()).toBe(false);
    fixture!.destroy(); fixture = undefined;
    await harness.reopen();
    expect(await harness.getAll('accounts')).toEqual([expect.objectContaining({ id: 1, guid: ACCOUNT_GUID, name: 'B' })]);
  });

  it('keeps the original baseline after a native transaction abort and clears protection when the edit is reverted', async () => {
    const host = fixture!.componentInstance;
    const reload = vi.spyOn(TestBed.inject(AccountWorkspaceService), 'reloadActiveWorkspace');
    host.abortBeforeCommit = true;
    host.form.controls.name.setValue('B');
    await expect(host.session.saveNow()).resolves.toBe(false);
    TestBed.tick();
    expect(host.session.state()).toBe('error');
    expect(host.session.dirty()).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    expect(await harness.getAll('accounts')).toEqual([expect.objectContaining({ guid: ACCOUNT_GUID, name: 'A' })]);
    host.form.controls.name.setValue('A');
    TestBed.tick();
    expect(host.session.dirty()).toBe(false);
    expect(TestBed.inject(UnsavedChangesService).hasUnsavedChanges()).toBe(false);
    expect(canLeave(host)).toBe(true);
    expect(unloadPrevented()).toBe(false);
    fixture!.destroy(); fixture = undefined;
    await harness.reopen();
    expect(await harness.getAll('accounts')).toEqual([expect.objectContaining({ id: 1, guid: ACCOUNT_GUID, name: 'A' })]);
  });
});

function canLeave(host: NativeSettingsEditHost) {
  return TestBed.runInInjectionContext(() => unsavedChangesGuard(host,
    {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot, {} as RouterStateSnapshot));
}

function unloadPrevented(): boolean {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

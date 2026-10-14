import { TestBed } from '@angular/core/testing';
import { configureDataValidationSettingsTest } from './data-validation-settings.testing';
import { DataValidationSettingsEditor } from './data-validation-settings-editor.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { unsavedChangesGuard } from '@app/v1/account/data/unsaved-changes.guard';
import { vi } from 'vitest';
import { applyDataValidationSettings, DataValidationSettingsGroup } from '@shared/settings-forms/data-validation-settings';

describe('DataValidationSettingsEditor', () => {
  afterEach(() => vi.restoreAllMocks());

  function setup(facilityContext = false) {
    const state = configureDataValidationSettingsTest();
    const editor = TestBed.inject(DataValidationSettingsEditor);
    editor.initialize(facilityContext);
    TestBed.tick();
    return { editor, ...state };
  }

  it('hydrates silently, tracks live inherited account values, and edits inheritance independently', async () => {
    const { editor, account, facility, facilityUpdate, execute } = setup(true);
    expect(execute).not.toHaveBeenCalled();
    account.set({ ...account(), expectedRangeSettings: { enabled: false } });
    TestBed.tick();
    expect(editor.expectedRangeForm.controls.enabled.value).toBe(false);
    expect(editor.expectedRangeForm.controls.enabled.disabled).toBe(true);
    editor.expectedRangeForm.controls.useAccountSettings.setValue(false);
    await editor.save('expectedRange');
    expect(editor.expectedRangeForm.controls.enabled.enabled).toBe(true);
    expect(editor.stalenessForm.controls.enabled.disabled).toBe(true);
    expect(facility().expectedRangeSettings).toEqual({ enabled: false, useAccountSettings: false });
    expect(facilityUpdate).toHaveBeenCalledTimes(1);
    account.set({ ...account(), expectedRangeSettings: { enabled: true } });
    TestBed.tick();
    expect(editor.expectedRangeForm.controls.enabled.value).toBe(false);
    editor.useAccountSettings('expectedRange');
    await editor.save('expectedRange');
    expect(facility().expectedRangeSettings).toEqual({ enabled: true, useAccountSettings: true });
  });

  it('retains failed drafts for retry and does not save another group', async () => {
    const { editor, account, accountUpdate } = setup();
    accountUpdate.mockRejectedValueOnce(new Error('disk failure'));
    editor.expectedRangeForm.controls.enabled.setValue(false);
    await editor.save('expectedRange');
    expect(editor.saveState()).toBe('error');
    expect(editor.expectedRangeForm.controls.enabled.value).toBe(false);
    account.set({ ...account(), name: 'Updated name' });
    TestBed.tick();
    expect(editor.expectedRangeForm.controls.enabled.value).toBe(false);
    await editor.retry();
    expect(editor.saveState()).toBe('saved');
    expect(account().expectedRangeSettings).toEqual({ enabled: false });
    expect(account().name).toBe('Updated name');
    expect(account().dataStalenessSettings).toEqual({ enabled: true, thresholdMonths: 3 });
  });

  it('serializes rapid edits including a reversal to the original value', async () => {
    const { editor, account, accountUpdate } = setup();
    let release!: () => void;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    accountUpdate.mockImplementationOnce(async updated => { await blocked; account.set(updated); return updated; });
    editor.expectedRangeForm.controls.enabled.setValue(false);
    const saving = editor.save('expectedRange');
    await Promise.resolve();
    editor.expectedRangeForm.controls.enabled.setValue(true);
    editor.expectedRangeForm.controls.enabled.setValue(true);
    release();
    await saving;
    expect(accountUpdate).toHaveBeenCalledTimes(2);
    expect(account().expectedRangeSettings?.enabled).toBe(true);
    expect(editor.saveState()).toBe('saved');
  });

  const refreshFailures = [
    { context: 'account', failure: 'workspace' },
    { context: 'facility', failure: 'workspace' },
    { context: 'singleFacility', failure: 'workspace' },
    { context: 'account', failure: 'catalog' },
    { context: 'singleFacility', failure: 'catalog' }
  ] as const;

  function setupRefreshFailure(context: typeof refreshFailures[number]['context'], failure: 'workspace' | 'catalog') {
    const state = configureDataValidationSettingsTest();
    state.account.set({ ...state.account(), isSingleFacilityCompany: context === 'singleFacility' });
    state.facility.set({ ...state.facility(),
      expectedRangeSettings: { enabled: true, useAccountSettings: false },
      dataStalenessSettings: { enabled: true, thresholdMonths: 3, useAccountSettings: false }
    });
    let storedAccount = state.account();
    let storedFacility = state.facility();
    // Persistence and workspace publication are separate, as in the real command boundary.
    state.accountUpdate.mockImplementation(async updated => { storedAccount = updated; return updated; });
    state.facilityUpdate.mockImplementation(async updated => { storedFacility = updated; return updated; });
    state.compoundUpdate.mockImplementation(async (_account, _facility, change) => {
      storedAccount = applyDataValidationSettings(storedAccount, change, true);
      storedFacility = applyDataValidationSettings(storedFacility, change);
      return { account: storedAccount, facility: storedFacility };
    });
    let failWorkspace = failure === 'workspace';
    state.execute.mockImplementation(async (_metadata, persist) => {
      const value = await persist();
      if (failWorkspace) {
        failWorkspace = false;
        throw new Error('Committed workspace reload failed');
      }
      state.account.set(storedAccount);
      state.facility.set(storedFacility);
      return { value };
    });
    if (failure === 'catalog') state.refreshAccountCatalog.mockRejectedValueOnce(new Error('Account catalog refresh failed'));
    const editor = TestBed.inject(DataValidationSettingsEditor);
    editor.initialize(context !== 'account');
    TestBed.tick();
    const update = context === 'account' ? state.accountUpdate
      : context === 'facility' ? state.facilityUpdate : state.compoundUpdate;
    return { editor, ...state, update, storedAccount: () => storedAccount, storedFacility: () => storedFacility };
  }

  describe.each<DataValidationSettingsGroup>(['expectedRange', 'staleness'])('%s post-commit failures', group => {
    it.each(refreshFailures)('persists a reversal after a $context $failure refresh failure', async ({ context, failure }) => {
      const { editor, update, storedAccount, storedFacility } = setupRefreshFailure(context, failure);
      const form = group === 'expectedRange' ? editor.expectedRangeForm : editor.stalenessForm;
      const enabled = () => group === 'expectedRange'
        ? (context === 'account' ? storedAccount() : storedFacility()).expectedRangeSettings?.enabled
        : (context === 'account' ? storedAccount() : storedFacility()).dataStalenessSettings?.enabled;
      form.controls.enabled.setValue(false);
      await editor.save(group);
      expect(enabled()).toBe(false);
      expect(editor.saveState()).toBe('error');
      TestBed.tick();
      expect(form.controls.enabled.value).toBe(false);
      form.controls.enabled.setValue(true);
      await editor.save(group);
      expect(update).toHaveBeenCalledTimes(2);
      expect(enabled()).toBe(true);
      if (context === 'singleFacility') {
        expect(group === 'expectedRange' ? storedAccount().expectedRangeSettings?.enabled
          : storedAccount().dataStalenessSettings?.enabled).toBe(true);
      }
      expect(editor.saveState()).toBe('saved');
      expect(editor.saveError()).toBe('');
      expect(editor.hasUnsavedChanges()).toBe(false);
    });
  });

  it.each(['workspace', 'catalog'] as const)('retries reconciliation after a %s failure even when the draft already committed', async failure => {
    const { editor, update, execute, storedAccount } = setupRefreshFailure('account', failure);
    editor.expectedRangeForm.controls.enabled.setValue(false);
    await editor.save('expectedRange');
    expect(editor.saveState()).toBe('error');
    expect(storedAccount().expectedRangeSettings?.enabled).toBe(false);
    await editor.retry();
    expect(update).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(storedAccount().expectedRangeSettings?.enabled).toBe(false);
    expect(editor.saveState()).toBe('saved');
    expect(editor.hasUnsavedChanges()).toBe(false);
  });

  it('retains a failed reversal for retry after the previous edit committed without refreshing', async () => {
    const { editor, update, storedAccount } = setupRefreshFailure('account', 'workspace');
    editor.expectedRangeForm.controls.enabled.setValue(false);
    await editor.save('expectedRange');
    update.mockRejectedValueOnce(new Error('Reversal persistence failed'));
    editor.expectedRangeForm.controls.enabled.setValue(true);
    await editor.save('expectedRange');
    expect(storedAccount().expectedRangeSettings?.enabled).toBe(false);
    expect(editor.expectedRangeForm.controls.enabled.value).toBe(true);
    expect(editor.saveState()).toBe('error');
    expect(editor.hasUnsavedChanges()).toBe(true);
    await editor.retry();
    expect(storedAccount().expectedRangeSettings?.enabled).toBe(true);
    expect(editor.saveState()).toBe('saved');
    expect(update).toHaveBeenCalledTimes(3);
  });

  it('protects both queued groups from navigation until all saves finish', async () => {
    const { editor, account, accountUpdate } = setup();
    let release!: () => void;
    let notifyStarted!: () => void;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    const started = new Promise<void>(resolve => { notifyStarted = resolve; });
    accountUpdate.mockImplementationOnce(async updated => {
      notifyStarted();
      await blocked;
      account.set(updated);
      return updated;
    });
    editor.stalenessForm.controls.enabled.setValue(false);
    const saving = editor.save('staleness');
    await started;
    editor.expectedRangeForm.controls.enabled.setValue(false);
    const confirm = vi.spyOn(window, 'confirm');
    const canLeave = () => TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(editor, null as any, null as any, null as any)
    );
    expect(canLeave()).toBe(false);
    expect(TestBed.inject(UnsavedChangesService).confirmDiscard()).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
    release();
    await saving;
    expect(accountUpdate).toHaveBeenCalledTimes(2);
    expect(account().dataStalenessSettings?.enabled).toBe(false);
    expect(account().expectedRangeSettings?.enabled).toBe(false);
    expect(canLeave()).toBe(true);
    expect(TestBed.inject(UnsavedChangesService).hasUnsavedChanges()).toBe(false);
  });

  it('clears the save error when a failed edit is reverted without another write', async () => {
    const { editor, account, accountUpdate } = setup();
    accountUpdate.mockRejectedValueOnce(new Error('disk failure'));
    editor.expectedRangeForm.controls.enabled.setValue(false);
    await editor.save('expectedRange');
    expect(editor.saveState()).toBe('error');
    editor.expectedRangeForm.controls.enabled.setValue(true);
    await editor.save('expectedRange');
    expect(editor.saveState()).toBe('saved');
    expect(editor.saveError()).toBe('');
    expect(editor.hasUnsavedChanges()).toBe(false);
    await editor.retry();
    expect(editor.saveError()).toBe('');
    expect(accountUpdate).toHaveBeenCalledTimes(1);
    expect(account().expectedRangeSettings?.enabled).toBe(true);
  });

  it('keeps another failed group visible when only one edit is reverted', async () => {
    const { editor, accountUpdate } = setup();
    accountUpdate.mockRejectedValueOnce(new Error('staleness failure'));
    accountUpdate.mockRejectedValueOnce(new Error('range failure'));
    editor.stalenessForm.controls.enabled.setValue(false);
    await editor.save('staleness');
    editor.expectedRangeForm.controls.enabled.setValue(false);
    await editor.save('expectedRange');
    editor.expectedRangeForm.controls.enabled.setValue(true);
    await editor.save('expectedRange');
    expect(editor.saveState()).toBe('error');
    expect(editor.hasUnsavedChanges()).toBe(true);
    editor.stalenessForm.controls.enabled.setValue(true);
    await editor.save('staleness');
    expect(editor.saveState()).toBe('saved');
    expect(editor.saveError()).toBe('');
    expect(accountUpdate).toHaveBeenCalledTimes(2);
  });

  it('restores stored values on an explicitly confirmed discard and cleans up navigation hooks', async () => {
    const { editor, accountUpdate } = setup();
    accountUpdate.mockRejectedValueOnce(new Error('disk failure'));
    editor.expectedRangeForm.controls.enabled.setValue(false);
    await editor.save('expectedRange');
    const beforeUnload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    expect(TestBed.inject(UnsavedChangesService).confirmDiscard()).toBe(true);
    expect(editor.expectedRangeForm.controls.enabled.value).toBe(true);
    expect(editor.saveState()).toBe('saved');
    expect(editor.saveError()).toBe('');
    expect(accountUpdate).toHaveBeenCalledTimes(1);
    const unsaved = TestBed.inject(UnsavedChangesService);
    TestBed.resetTestingModule();
    const afterDestroy = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(afterDestroy);
    expect(afterDestroy.defaultPrevented).toBe(false);
    expect(unsaved.hasUnsavedChanges()).toBe(false);
  });

  it('coalesces synchronous edits and disables controls when writes are unavailable', async () => {
    const { editor, canWrite, accountUpdate } = setup();
    editor.expectedRangeForm.controls.enabled.setValue(false);
    editor.expectedRangeForm.controls.enabled.setValue(false);
    await editor.save('expectedRange');
    expect(accountUpdate).toHaveBeenCalledTimes(1);
    canWrite.set(false);
    TestBed.tick();
    expect(editor.expectedRangeForm.disabled).toBe(true);
    expect(editor.stalenessForm.disabled).toBe(true);
    await editor.save('expectedRange');
    expect(accountUpdate).toHaveBeenCalledTimes(1);
  });

  it('preserves changes committed while the settings edit waits in the command queue', async () => {
    const { editor, account, execute } = setup();
    execute.mockImplementationOnce(async (_metadata, persist) => {
      account.set({ ...account(), name: 'Changed by earlier command', dataStalenessSettings: { enabled: false, thresholdMonths: 12 } });
      return { value: await persist() };
    });
    editor.expectedRangeForm.controls.enabled.setValue(false);
    await editor.save('expectedRange');
    expect(account().name).toBe('Changed by earlier command');
    expect(account().dataStalenessSettings).toEqual({ enabled: false, thresholdMonths: 12 });
    expect(account().expectedRangeSettings).toEqual({ enabled: false });
  });
});

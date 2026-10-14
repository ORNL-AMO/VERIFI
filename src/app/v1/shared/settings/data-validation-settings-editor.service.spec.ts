import { TestBed } from '@angular/core/testing';
import { configureDataValidationSettingsTest } from './data-validation-settings.testing';
import { DataValidationSettingsEditor } from './data-validation-settings-editor.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { unsavedChangesGuard } from '@app/v1/account/data/unsaved-changes.guard';
import { vi } from 'vitest';

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

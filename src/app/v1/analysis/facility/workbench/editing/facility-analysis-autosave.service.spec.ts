import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { ANALYSIS_AUTOSAVE_DEBOUNCE_MS, FacilityAnalysisAutosaveService } from './facility-analysis-autosave.service';

describe('FacilityAnalysisAutosaveService', () => {
  const analysis = { guid: 'analysis-a', accountId: 'account-a', name: 'Original', groups: [] } as IdbAnalysisItem;
  const analysisState = signal<IdbAnalysisItem | undefined>(analysis);
  const execute = vi.fn();
  const updateFacilityAnalysisWithSingleSitePair = vi.fn();
  let service: FacilityAnalysisAutosaveService;

  beforeEach(() => {
    vi.useFakeTimers();
    analysisState.set(structuredClone(analysis));
    execute.mockReset();
    updateFacilityAnalysisWithSingleSitePair.mockReset();
    execute.mockImplementation(async (_options, persist: () => Promise<unknown>) => ({
      value: await persist(),
      change: {}
    }));
    updateFacilityAnalysisWithSingleSitePair.mockImplementation(async (item: IdbAnalysisItem) => ({
      analysis: structuredClone(item),
      accountAnalyses: []
    }));
    TestBed.configureTestingModule({
      providers: [
        FacilityAnalysisAutosaveService,
        { provide: FacilityAnalysisWorkbenchContext, useValue: { analysis: analysisState, account: signal({ guid: 'account-a' }) } },
        { provide: WorkspaceCommandBoundary, useValue: { execute } },
        { provide: AnalysisCommandHandler, useValue: { updateFacilityAnalysisWithSingleSitePair } },
        UnsavedChangesService
      ]
    });
    service = TestBed.inject(FacilityAnalysisAutosaveService);
    TestBed.tick();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('debounces text edits and publishes the saved draft', async () => {
    service.update(draft => { draft.name = 'First'; });
    service.update(draft => { draft.name = 'Final'; });

    expect(service.state()).toBe('dirty');
    expect(execute).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(ANALYSIS_AUTOSAVE_DEBOUNCE_MS);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(updateFacilityAnalysisWithSingleSitePair.mock.calls[0][0].name).toBe('Final');
    expect(service.state()).toBe('saved');
    expect(service.committed()?.name).toBe('Final');
  });

  it('retains a failed draft and restores the committed record on discard', async () => {
    execute.mockRejectedValueOnce(new Error('Disk unavailable'));
    service.update(draft => { draft.name = 'Unsaved'; }, { immediate: true });
    await vi.runAllTimersAsync();

    expect(service.state()).toBe('error');
    expect(service.error()).toBe('Disk unavailable');
    expect(service.draft()?.name).toBe('Unsaved');
    expect(service.committed()?.name).toBe('Original');

    service.discard();
    expect(service.state()).toBe('saved');
    expect(service.draft()?.name).toBe('Original');
  });

  it('does not submit invalid drafts', async () => {
    service.update(draft => { draft.name = ''; }, { valid: false });
    await vi.advanceTimersByTimeAsync(ANALYSIS_AUTOSAVE_DEBOUNCE_MS * 2);
    expect(service.state()).toBe('invalid');
    expect(execute).not.toHaveBeenCalled();
  });

  it('evaluates validity against the complete updated draft', async () => {
    service.update(draft => { draft.name = ''; }, { valid: draft => draft.name.trim().length > 0 });
    service.update(draft => { draft.hasBanking = true; }, { valid: draft => draft.name.trim().length > 0 });

    await vi.advanceTimersByTimeAsync(ANALYSIS_AUTOSAVE_DEBOUNCE_MS * 2);

    expect(service.state()).toBe('invalid');
    expect(service.draft()).toMatchObject({ name: '', hasBanking: true });
    expect(execute).not.toHaveBeenCalled();
  });
  it.each(['dirty', 'invalid', 'error'] as const)('holds a %s draft without saving, then restores it on cancel', async state => {
    if (state === 'error') {
      execute.mockRejectedValueOnce(new Error('Disk unavailable'));
      service.update(draft => { draft.name = 'Unsaved'; }, { immediate: true });
      await vi.runAllTimersAsync();
    } else {
      service.update(draft => { draft.name = state === 'invalid' ? '' : 'Unsaved'; }, { valid: state !== 'invalid' });
    }
    const draft = structuredClone(service.draft());
    const count = execute.mock.calls.length;
    expect(await service.beginDeletion()).toBe(true);
    expect(service.isBlocked()).toBe(true);
    service.update(item => { item.name = 'Must not edit'; });
    service.discard(); service.retry();
    expect(await service.flush()).toBe(false);
    await vi.advanceTimersByTimeAsync(ANALYSIS_AUTOSAVE_DEBOUNCE_MS * 2);
    expect(execute).toHaveBeenCalledTimes(count);
    expect(service.draft()).toEqual(draft);
    service.cancelDeletion();
    expect(service.isBlocked()).toBe(false);
    expect(service.state()).toBe(state);
    expect(service.draft()).toEqual(draft);
    await vi.advanceTimersByTimeAsync(ANALYSIS_AUTOSAVE_DEBOUNCE_MS);
    expect(execute).toHaveBeenCalledTimes(count + (state === 'dirty' ? 1 : 0));
  });

  it.each([false, true])('drains a submitted save without submitting the newer draft (invalid=%s)', async invalid => {
    let settle!: () => void;
    const pending = new Promise<void>(resolve => { settle = resolve; });
    execute.mockImplementationOnce(async (_options, persist: () => Promise<unknown>) => {
      await pending;
      return { value: await persist(), change: {} };
    });
    service.update(draft => { draft.name = 'Submitted'; }, { immediate: true });
    service.update(draft => { draft.name = invalid ? '' : 'Newer'; }, { valid: !invalid });
    let ready = false;
    const preparation = service.beginDeletion().then(result => { ready = result; });
    expect(ready).toBe(false);
    settle();
    await preparation;
    await vi.runAllTimersAsync();
    expect(ready).toBe(true);
    expect(service.draft()?.name).toBe(invalid ? '' : 'Newer');
    expect(service.state()).toBe(invalid ? 'invalid' : 'dirty');
    expect(execute).toHaveBeenCalledTimes(1);
    service.completeDeletion();
    expect(service.draft()).toBeUndefined();
    expect(service.isDirty()).toBe(false);
    expect(service.isBlocked()).toBe(false);
    await vi.runAllTimersAsync();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('does not approve a deletion after its owner changes while a save drains', async () => {
    let settle!: () => void;
    const pending = new Promise<void>(resolve => { settle = resolve; });
    execute.mockImplementationOnce(async (_options, persist: () => Promise<unknown>) => {
      await pending;
      return { value: await persist(), change: {} };
    });
    service.update(draft => { draft.name = 'Submitted'; }, { immediate: true });
    const preparation = service.beginDeletion();
    analysisState.set({ ...analysis, guid: 'other-analysis', name: 'Other' });
    settle();
    expect(await preparation).toBe(false);
    service.cancelDeletion(); TestBed.tick();
    expect(service.draft()?.guid).toBe('other-analysis');
    expect(service.deletionHeld()).toBe(false);
  });

  it('keeps an old completion from releasing a new owner’s pending save', async () => {
    let finishOld!: () => void, finishNew!: () => void;
    execute.mockImplementationOnce(async (_options, persist: () => Promise<unknown>) => {
      await new Promise<void>(resolve => { finishOld = resolve; });
      return { value: await persist(), change: {} };
    }).mockImplementationOnce(async (_options, persist: () => Promise<unknown>) => {
      await new Promise<void>(resolve => { finishNew = resolve; });
      return { value: await persist(), change: {} };
    });
    service.update(draft => { draft.name = 'Old'; }, { immediate: true });
    const preparation = service.beginDeletion();
    analysisState.set({ ...analysis, guid: 'other-analysis', name: 'Other' });
    service.cancelDeletion(); TestBed.tick();
    service.update(draft => { draft.name = 'New owner edit'; }, { immediate: true });
    finishOld(); expect(await preparation).toBe(false);
    expect(service.state()).toBe('saving');
    expect(service.isBlocked()).toBe(true);
    analysisState.set({ ...analysisState()!, name: 'New owner edit' });
    finishNew(); await vi.runAllTimersAsync();
    expect(service.committed()?.name).toBe('New owner edit');
    expect(service.committed()?.guid).toBe('other-analysis');
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('never submits a queued draft after the editor is destroyed', async () => {
    let finish!: () => void;
    execute.mockImplementationOnce(async (_options, persist: () => Promise<unknown>) => {
      await new Promise<void>(resolve => { finish = resolve; });
      return { value: await persist(), change: {} };
    });
    service.update(draft => { draft.name = 'Submitted'; }, { immediate: true });
    service.update(draft => { draft.name = 'Queued'; });
    TestBed.resetTestingModule();
    finish(); await vi.runAllTimersAsync();
    expect(execute).toHaveBeenCalledTimes(1);
  });

});

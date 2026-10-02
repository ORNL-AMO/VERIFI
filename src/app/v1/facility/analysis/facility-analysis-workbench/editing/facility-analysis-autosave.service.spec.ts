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
  const updateFacilityAnalysis = vi.fn();
  let service: FacilityAnalysisAutosaveService;

  beforeEach(() => {
    vi.useFakeTimers();
    analysisState.set(structuredClone(analysis));
    execute.mockReset();
    updateFacilityAnalysis.mockReset();
    execute.mockImplementation(async (_options, persist: () => Promise<IdbAnalysisItem>) => ({
      value: await persist(),
      change: {}
    }));
    updateFacilityAnalysis.mockImplementation(async (item: IdbAnalysisItem) => structuredClone(item));
    TestBed.configureTestingModule({
      providers: [
        FacilityAnalysisAutosaveService,
        { provide: FacilityAnalysisWorkbenchContext, useValue: { analysis: analysisState, account: signal({ guid: 'account-a' }) } },
        { provide: WorkspaceCommandBoundary, useValue: { execute } },
        { provide: AnalysisCommandHandler, useValue: { updateFacilityAnalysis } },
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
    expect(updateFacilityAnalysis.mock.calls[0][0].name).toBe('Final');
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
});

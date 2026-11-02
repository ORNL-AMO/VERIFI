import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';
import {
  ACCOUNT_ANALYSIS_AUTOSAVE_DEBOUNCE_MS,
  AccountAnalysisAutosaveService
} from './account-analysis-autosave.service';

describe('AccountAnalysisAutosaveService', () => {
  const analysis = {
    guid: 'analysis-a', accountId: 'account-a', name: 'Original', baselineYear: 2024,
    facilityAnalysisItems: []
  } as IdbAccountAnalysisItem;
  const analysisState = signal<IdbAccountAnalysisItem | undefined>(analysis);
  const execute = vi.fn();
  const updateAccountAnalysis = vi.fn();
  let service: AccountAnalysisAutosaveService;

  beforeEach(() => {
    vi.useFakeTimers();
    analysisState.set(structuredClone(analysis));
    execute.mockReset();
    updateAccountAnalysis.mockReset();
    execute.mockImplementation(async (_options, persist: () => Promise<IdbAccountAnalysisItem>) => ({
      value: await persist(), change: {}
    }));
    updateAccountAnalysis.mockImplementation(async (item: IdbAccountAnalysisItem) => structuredClone(item));
    TestBed.configureTestingModule({ providers: [
      AccountAnalysisAutosaveService,
      { provide: AccountAnalysisWorkbenchContext, useValue: { analysis: analysisState, account: signal({ guid: 'account-a' }) } },
      { provide: WorkspaceCommandBoundary, useValue: { execute } },
      { provide: AnalysisCommandHandler, useValue: { updateAccountAnalysis } },
      UnsavedChangesService
    ] });
    service = TestBed.inject(AccountAnalysisAutosaveService);
    TestBed.tick();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('debounces text edits and commits the final immutable draft', async () => {
    service.update(draft => { draft.name = 'First'; });
    service.update(draft => { draft.name = 'Final'; });

    expect(service.state()).toBe('dirty');
    expect(analysisState().name).toBe('Original');
    await vi.advanceTimersByTimeAsync(ACCOUNT_ANALYSIS_AUTOSAVE_DEBOUNCE_MS);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(updateAccountAnalysis.mock.calls[0][0].name).toBe('Final');
    expect(service.state()).toBe('saved');
    expect(service.committed()?.name).toBe('Final');
  });

  it('saves calculation inputs immediately and flushes pending edits before navigation', async () => {
    service.update(draft => { draft.baselineYear = 2023; }, { immediate: true });
    await vi.runAllTimersAsync();
    expect(updateAccountAnalysis.mock.calls[0][0].baselineYear).toBe(2023);

    service.update(draft => { draft.name = 'Pending'; });
    expect(await service.flush()).toBe(true);
    expect(updateAccountAnalysis.mock.calls.at(-1)?.[0].name).toBe('Pending');
  });

  it('queues a newer draft while a save is in flight without letting the stale result replace it', async () => {
    let releaseFirstSave!: () => void;
    const firstSave = new Promise<void>(resolve => { releaseFirstSave = resolve; });
    execute.mockImplementationOnce(async (_options, persist: () => Promise<IdbAccountAnalysisItem>) => {
      await firstSave;
      return { value: await persist(), change: {} };
    });

    service.update(draft => { draft.name = 'First'; }, { immediate: true });
    service.update(draft => { draft.name = 'Newest'; }, { immediate: true });
    expect(service.draft()?.name).toBe('Newest');

    releaseFirstSave();
    await vi.runAllTimersAsync();

    expect(updateAccountAnalysis).toHaveBeenCalledTimes(2);
    expect(updateAccountAnalysis.mock.calls[1][0].name).toBe('Newest');
    expect(service.committed()?.name).toBe('Newest');
    expect(service.draft()?.name).toBe('Newest');
  });

  it('retains failed edits for retry and restores the committed record on discard', async () => {
    execute.mockRejectedValueOnce(new Error('Disk unavailable'));
    service.update(draft => { draft.name = 'Unsaved'; }, { immediate: true });
    await vi.runAllTimersAsync();

    expect(service.state()).toBe('error');
    expect(service.error()).toBe('Disk unavailable');
    expect(service.draft()?.name).toBe('Unsaved');
    service.discard();
    expect(service.state()).toBe('saved');
    expect(service.draft()?.name).toBe('Original');
  });

  it('does not persist an invalid setup draft', async () => {
    service.update(draft => { draft.name = '   '; }, { valid: false });
    await vi.advanceTimersByTimeAsync(ACCOUNT_ANALYSIS_AUTOSAVE_DEBOUNCE_MS * 2);
    expect(service.state()).toBe('invalid');
    expect(execute).not.toHaveBeenCalled();
    expect(await service.flush()).toBe(false);
  });
});

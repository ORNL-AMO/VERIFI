import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { PredictorCommandHandler } from '@data/account-workspace/handlers/predictor-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { PredictorWorkspaceActionsService } from './predictor-workspace-actions.service';

describe('PredictorWorkspaceActionsService', () => {
  const existing = {
    id: 10, guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production',
    predictorType: 'Standard', production: true, productionInAnalysis: true, unit: 'tons'
  } as any;
  const readings = signal<any[]>([{ id: 20, guid: 'reading-a', predictorId: 'predictor-a', accountId: 'account-a' }]);
  const predictorHandler = {
    addPredictor: vi.fn(async (value: any) => ({ ...value, id: 11 })),
    updatePredictor: vi.fn(async (value: any) => value),
    deletePredictor: vi.fn(async () => 10),
    deletePredictorData: vi.fn(async () => 20)
  };
  const analysisHandler = {
    addAnalysisPredictor: vi.fn(async () => undefined),
    updateAnalysisPredictor: vi.fn(async () => undefined),
    deleteAnalysisPredictor: vi.fn(async () => undefined)
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [
      PredictorWorkspaceActionsService,
      { provide: AccountWorkspaceStore, useValue: {
        account: signal({ guid: 'account-a' }), selectedFacility: signal({ guid: 'facility-a' }),
        predictors: signal([existing]), predictorData: readings
      } },
      { provide: AccountWorkspaceService, useValue: { reloadActiveWorkspace: vi.fn(async () => 'published') } },
      { provide: WorkspaceCommandBoundary, useValue: {
        execute: vi.fn(async (options: any, persist: () => Promise<unknown>) => ({ value: await persist(), change: options }))
      } },
      { provide: PredictorCommandHandler, useValue: predictorHandler },
      { provide: AnalysisCommandHandler, useValue: analysisHandler }
    ] });
  });

  it('copies settings into a new identity without copying readings', async () => {
    const copy = await TestBed.inject(PredictorWorkspaceActionsService).copyPredictor(existing);
    expect(copy.guid).not.toBe(existing.guid);
    expect(copy.name).toBe('Production (copy)');
    expect(predictorHandler.addPredictor).toHaveBeenCalledOnce();
    expect(analysisHandler.addAnalysisPredictor).toHaveBeenCalledOnce();
  });

  it('deletes readings and analysis references before deleting the predictor', async () => {
    await TestBed.inject(PredictorWorkspaceActionsService).deletePredictor(existing);
    expect(predictorHandler.deletePredictorData).toHaveBeenCalledWith(20);
    expect(analysisHandler.deleteAnalysisPredictor).toHaveBeenCalledWith(expect.objectContaining({ guid: 'predictor-a' }));
    expect(predictorHandler.deletePredictor).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }), 'account-a');
  });

  it('reloads authoritative workspace state after a partial command failure', async () => {
    analysisHandler.addAnalysisPredictor.mockRejectedValueOnce(new Error('analysis failed'));
    const workspaceService = TestBed.inject(AccountWorkspaceService) as unknown as { reloadActiveWorkspace: ReturnType<typeof vi.fn> };

    await expect(TestBed.inject(PredictorWorkspaceActionsService).copyPredictor(existing)).rejects.toThrow('analysis failed');

    expect(workspaceService.reloadActiveWorkspace).toHaveBeenCalledWith(true);
  });
});

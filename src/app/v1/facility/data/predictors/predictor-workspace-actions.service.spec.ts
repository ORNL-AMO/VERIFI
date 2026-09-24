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
  const readings = signal<any[]>([reading('reading-a', 20, 2026, 1)]);
  const predictors = signal<any[]>([existing]);
  const predictorHandler = {
    addPredictor: vi.fn(async (value: any) => ({ ...value, id: 11 })),
    updatePredictor: vi.fn(async (value: any) => value),
    deletePredictor: vi.fn(async () => 10),
    deletePredictorData: vi.fn(async () => 20),
    addPredictorData: vi.fn(async (value: any) => ({ ...value, id: 21 })),
    updatePredictorData: vi.fn(async (value: any) => value),
    reconcilePredictorData: vi.fn(async () => undefined),
    createWeatherPredictors: vi.fn(async () => undefined),
    updateWeatherPredictor: vi.fn(async () => undefined),
    applyWeatherStationGroup: vi.fn(async () => undefined),
    applyWeatherStationMonth: vi.fn(async () => undefined)
  };
  const analysisHandler = {
    addAnalysisPredictor: vi.fn(async () => undefined),
    updateAnalysisPredictor: vi.fn(async () => undefined),
    deleteAnalysisPredictor: vi.fn(async () => undefined)
  };

  beforeEach(() => {
    vi.clearAllMocks();
    readings.set([reading('reading-a', 20, 2026, 1)]);
    predictors.set([existing]);
    TestBed.configureTestingModule({ providers: [
      PredictorWorkspaceActionsService,
      { provide: AccountWorkspaceStore, useValue: {
        account: signal({ guid: 'account-a' }), selectedFacility: signal({ guid: 'facility-a' }),
        predictors, facilityPredictors: predictors, predictorData: readings, facilityPredictorData: readings,
        facilityAnalyses: signal([]), revision: signal(4)
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

  it('updates readings through the predictor command handler', async () => {
    const updated = { ...readings()[0], amount: 42 };

    await TestBed.inject(PredictorWorkspaceActionsService).updatePredictorReading(updated);

    expect(predictorHandler.updatePredictorData).toHaveBeenCalledWith(expect.objectContaining({ id: 20, amount: 42 }), 'account-a');
  });

  it('rejects changing a predictor type after creation', async () => {
    await expect(TestBed.inject(PredictorWorkspaceActionsService).updatePredictor({
      ...existing, predictorType: 'Weather'
    })).rejects.toThrow('cannot be changed');
    expect(predictorHandler.updatePredictor).not.toHaveBeenCalled();
  });

  it('deletes selected readings in one atomic reconciliation command', async () => {
    readings.set([reading('reading-a', 20, 2026, 1), reading('reading-b', 21, 2026, 2)]);

    await TestBed.inject(PredictorWorkspaceActionsService).deletePredictorReadings('predictor-a', readings());

    expect(predictorHandler.reconcilePredictorData).toHaveBeenCalledWith(
      'predictor-a',
      { add: [], update: [], delete: readings() },
      'account-a'
    );
  });

  it('rechecks gaps and fills Weather months as manual overrides', async () => {
    readings.set([reading('reading-a', 20, 2026, 1), reading('reading-c', 22, 2026, 3)]);
    const weather = { ...existing, predictorType: 'Weather' };
    (TestBed.inject(AccountWorkspaceStore) as any).predictors.set([weather]);

    const added = await TestBed.inject(PredictorWorkspaceActionsService).fillMissingPredictorMonths(
      'predictor-a',
      [{ year: 2026, month: 2, key: '2026-02', label: 'Feb 2026' }]
    );

    expect(added).toHaveLength(1);
    expect(added[0]).toEqual(expect.objectContaining({ amount: 0, month: 2, weatherOverride: true }));
    expect(predictorHandler.reconcilePredictorData).toHaveBeenCalledWith(
      'predictor-a',
      expect.objectContaining({ add: added }),
      'account-a'
    );
  });

  it('creates generated predictors and readings in one atomic command', async () => {
    const generated = { ...existing, id: undefined, guid: 'weather-a', predictorType: 'Weather' };
    const generatedReading = { ...reading('weather-reading', 0, 2026, 1), id: undefined, predictorId: 'weather-a' };

    await TestBed.inject(PredictorWorkspaceActionsService).createWeatherPredictors({
      workspaceRevision: 4,
      range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 1 } },
      predictors: [generated], readings: [generatedReading], warningMonths: []
    });

    expect(predictorHandler.createWeatherPredictors).toHaveBeenCalledWith(expect.objectContaining({
      predictors: [generated], predictorData: [generatedReading]
    }), 'account-a');
  });

  it('rejects a stale weather preview before persistence', async () => {
    await expect(TestBed.inject(PredictorWorkspaceActionsService).createWeatherPredictors({
      workspaceRevision: 3,
      range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 1 } },
      predictors: [], readings: [], warningMonths: []
    })).rejects.toThrow('changed');

    expect(predictorHandler.createWeatherPredictors).not.toHaveBeenCalled();
  });

  it('commits a reviewed station group through one atomic handler call', async () => {
    const weather = {
      ...existing, predictorType: 'Weather', weatherStationId: 'station-a', weatherStationName: 'Station A'
    };
    predictors.set([weather]);
    const preview = {
      workspaceRevision: 4,
      sourceGroupKey: 'station:station-a',
      station: { ID: 'station-b', name: 'Station B' },
      range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 1 } },
      addPredictors: [],
      updatePredictors: [{ ...weather, weatherStationId: 'station-b', weatherStationName: 'Station B' }],
      deletePredictors: [], addReadings: [], updateReadings: [], deleteReadings: [], facilityAnalyses: [], warningMonths: []
    } as any;

    await TestBed.inject(PredictorWorkspaceActionsService).applyWeatherStationGroup(preview);

    expect(predictorHandler.applyWeatherStationGroup).toHaveBeenCalledWith(expect.objectContaining({
      updatePredictors: [expect.objectContaining({ weatherStationId: 'station-b' })]
    }), 'account-a');
  });

  it('commits one station month command after validating current group membership', async () => {
    const weatherA = { ...existing, predictorType: 'Weather', weatherStationId: 'station-a' };
    const weatherB = { ...weatherA, id: 11, guid: 'predictor-b', name: 'Humidity' };
    predictors.set([weatherA, weatherB]);
    const currentReading = reading('reading-a', 20, 2026, 1);
    readings.set([currentReading]);

    await TestBed.inject(PredictorWorkspaceActionsService).applyWeatherStationMonth({
      workspaceRevision: 4, groupKey: 'station:station-a', predictorGuids: ['predictor-a', 'predictor-b'],
      year: 2026, month: 1, add: [], update: [{ ...currentReading, amount: 2 }], delete: []
    });

    expect(predictorHandler.applyWeatherStationMonth).toHaveBeenCalledWith(expect.objectContaining({
      facilityId: 'facility-a', predictorGuids: ['predictor-a', 'predictor-b'], year: 2026, month: 1
    }), 'account-a');
  });

  it('rejects a stale station month without calling the command boundary', async () => {
    const boundary = TestBed.inject(WorkspaceCommandBoundary) as unknown as { execute: ReturnType<typeof vi.fn> };
    await expect(TestBed.inject(PredictorWorkspaceActionsService).applyWeatherStationMonth({
      workspaceRevision: 3, groupKey: 'station:station-a', predictorGuids: [],
      year: 2026, month: 1, add: [], update: [], delete: []
    })).rejects.toMatchObject({ code: 'stale-workspace' });
    expect(boundary.execute).not.toHaveBeenCalled();
  });
});

function reading(guid: string, id: number, year: number, month: number): any {
  return {
    id, guid, predictorId: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a',
    year, month, amount: 1, notes: '', weatherDataWarning: false, weatherOverride: false
  };
}

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { PredictorCommandHandler } from '@data/account-workspace/handlers/predictor-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { PredictorWorkspaceActionsService } from './predictor-workspace-actions.service';
import { EditorConflictError } from '@app/v1/data/editing/draft-reconciliation';
import { standardPredictorSettings } from './models/standard-predictor-settings.models';

describe('PredictorWorkspaceActionsService', () => {
  const existing = {
    id: 10, guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production',
    predictorType: 'Standard', production: true, productionInAnalysis: true, unit: 'tons'
  } as any;
  const readings = signal<any[]>([reading('reading-a', 20, 2026, 1)]);
  const predictors = signal<any[]>([existing]);
  const facilityPredictors = signal<any[]>([existing]);
  const canWrite = signal(true);
  const hasPending = signal(false);
  const predictorHandler = {
    createStandardPredictor: vi.fn(async ({ predictor }: any) => ({ ...predictor, id: 11 })),
    updateStandardPredictor: vi.fn(async ({ predictor }: any) => predictor),
    deletePredictorsWithData: vi.fn(async () => 2),
    deleteStandardPredictor: vi.fn(async () => undefined),
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
  beforeEach(() => {
    vi.clearAllMocks();
    readings.set([reading('reading-a', 20, 2026, 1)]);
    predictors.set([existing]);
    facilityPredictors.set([existing]);
    canWrite.set(true);
    hasPending.set(false);
    TestBed.configureTestingModule({ providers: [
      PredictorWorkspaceActionsService,
      { provide: AccountWorkspaceStore, useValue: {
        account: signal({ guid: 'account-a' }), facilities: signal([{ guid: 'facility-a', accountId: 'account-a' }]), selectedFacility: signal({ guid: 'facility-a' }),
        predictors, facilityPredictors, predictorData: readings, facilityPredictorData: readings,
        facilityAnalyses: signal([]), revision: signal(4), canWrite, hasPending
      } },
      { provide: AccountWorkspaceService, useValue: { reloadActiveWorkspace: vi.fn(async () => 'published') } },
      { provide: WorkspaceCommandBoundary, useValue: {
        execute: vi.fn(async (options: any, persist: () => Promise<unknown>) => ({ value: await persist(), change: options }))
      } },
      { provide: PredictorCommandHandler, useValue: predictorHandler },
    ] });
  });

  it('supports explicit account-inventory ownership without changing the selected facility', async () => {
    const store = TestBed.inject(AccountWorkspaceStore);
    (store.selectedFacility as any).set(undefined); facilityPredictors.set([]);
    const service = TestBed.inject(PredictorWorkspaceActionsService);
    await service.copyPredictor(existing, 'facility-a');
    const preview = service.previewDeletion([existing.guid], 'facility-a');
    await service.deletePredictors(preview, 'facility-a');
    expect(store.selectedFacility()).toBeUndefined();
    await expect(service.copyPredictor(existing, 'other')).rejects.toThrow('selected facility');
    expect(() => service.previewDeletion([existing.guid], 'other')).toThrow('this account');
    predictors.set([{ ...existing, accountId: 'other' }]);
    await expect(service.copyPredictor(existing, 'facility-a')).rejects.toThrow('selected facility');
  });

  it('resolves settings and dependent analyses from the latest queued workspace', async () => {
    const service = TestBed.inject(PredictorWorkspaceActionsService);
    const boundary = TestBed.inject(WorkspaceCommandBoundary);
    const store = TestBed.inject(AccountWorkspaceStore);
    let execute!: () => Promise<void>;
    vi.mocked(boundary.execute).mockImplementationOnce((options: any, persist: () => Promise<any>) => new Promise(resolve => {
      execute = async () => resolve({ value: await persist(), change: options });
    }));
    const base = standardPredictorSettings(existing);
    const saving = service.updateSettings({ accountGuid: 'account-a', facilityGuid: 'facility-a', predictorGuid: 'predictor-a' },
      { ...base, name: ' Edited production ' }, base, 'editor-owner');
    predictors.set([{ ...existing, id: 99, description: 'Saved note', importWizardName: 'Keep import marker' }]);
    (store.facilityAnalyses as any).set([{ id: 12, guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a',
      marker: 'latest', groups: [{ predictorVariables: [{ id: 'predictor-a', name: 'Old', unit: 'tons' }], models: [] }] }]);
    await execute();
    const committed = await saving;
    expect(committed).toMatchObject({ name: 'Edited production', description: 'Saved note' });
    expect(predictorHandler.updateStandardPredictor).toHaveBeenCalledWith(expect.objectContaining({
      predictor: expect.objectContaining({ id: 99, name: 'Edited production', description: 'Saved note', importWizardName: 'Keep import marker' }),
      facilityAnalyses: [expect.objectContaining({ marker: 'latest', groups: [expect.objectContaining({
        predictorVariables: [expect.objectContaining({ name: 'Edited production' })]
      })] })]
    }), 'account-a');
    expect(boundary.execute).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'editor-owner' }), expect.any(Function));
  });

  it('returns a typed conflict instead of overwriting an overlapping saved setting', async () => {
    const service = TestBed.inject(PredictorWorkspaceActionsService);
    const base = standardPredictorSettings(existing);
    predictors.set([{ ...existing, name: 'Committed name' }]);
    await expect(service.updateSettings({ accountGuid: 'account-a', facilityGuid: 'facility-a', predictorGuid: 'predictor-a' },
      { ...base, name: 'Local name' }, base, 'owner')).rejects.toBeInstanceOf(EditorConflictError);
    expect(predictorHandler.updateStandardPredictor).not.toHaveBeenCalled();
  });

  it('revalidates facility ownership and predictor type before a settings write', async () => {
    const service = TestBed.inject(PredictorWorkspaceActionsService);
    const base = standardPredictorSettings(existing);
    predictors.set([{ ...existing, predictorType: 'Weather' }]);
    await expect(service.updateSettings({ accountGuid: 'account-a', facilityGuid: 'facility-a', predictorGuid: 'predictor-a' },
      { ...base, name: 'Edited' }, base, 'owner')).rejects.toThrow('Standard predictor');
    predictors.set([existing]);
    (TestBed.inject(AccountWorkspaceStore).selectedFacility as any).set({ guid: 'facility-b' });
    await expect(service.updateSettings({ accountGuid: 'account-a', facilityGuid: 'facility-a', predictorGuid: 'predictor-a' },
      { ...base, name: 'Edited' }, base, 'owner')).rejects.toThrow('no longer available');
    expect(predictorHandler.updateStandardPredictor).not.toHaveBeenCalled();
  });

  it('retains unedited reading fields from the latest queued record', async () => {
    const service = TestBed.inject(PredictorWorkspaceActionsService);
    const boundary = TestBed.inject(WorkspaceCommandBoundary);
    let execute!: () => Promise<void>;
    vi.mocked(boundary.execute).mockImplementationOnce((options: any, persist: () => Promise<any>) => new Promise(resolve => {
      execute = async () => resolve({ value: await persist(), change: options });
    }));
    const source = readings()[0];
    const saving = service.updatePredictorReading({ ...source, notes: 'Local note' });
    readings.set([{ ...source, amount: 30, weatherDataChanged: true }]);
    await execute(); await saving;
    expect(predictorHandler.updatePredictorData).toHaveBeenCalledWith(expect.objectContaining({
      amount: 30, notes: 'Local note', weatherDataChanged: true
    }), 'account-a');
  });

  it.each([
    { local: { year: 2027 }, saved: { month: 2 } },
    { local: { month: 2 }, saved: { year: 2027 } }
  ])('reviews concurrent period changes instead of combining $local with $saved', async ({ local, saved }) => {
    const service = TestBed.inject(PredictorWorkspaceActionsService);
    const execute = deferNextReadingCommand();
    const source = readings()[0];
    const saving = service.updatePredictorReading({ ...source, ...local, notes: 'Local note' });
    const rejected = expect(saving).rejects.toBeInstanceOf(EditorConflictError);
    readings.set([{ ...source, ...saved }]);

    await execute(); await rejected;

    expect(predictorHandler.updatePredictorData).not.toHaveBeenCalled();
  });

  it('validates the merged period against duplicate months in the latest queued workspace', async () => {
    const service = TestBed.inject(PredictorWorkspaceActionsService);
    const execute = deferNextReadingCommand();
    const source = readings()[0];
    const saving = service.updatePredictorReading({ ...source, notes: 'Local note' });
    const rejected = expect(saving).rejects.toMatchObject({
      code: 'validation-failed', message: 'A predictor reading already exists for this month.'
    });
    readings.set([{ ...source, year: 2027, month: 2 }, reading('duplicate-month', 21, 2027, 2)]);

    await execute(); await rejected;

    expect(predictorHandler.updatePredictorData).not.toHaveBeenCalled();
  });

  it.each([{ year: 0, month: 1 }, { year: 2027, month: 13 }])(
    'rejects a merged saved period outside the supported range: %j', async savedPeriod => {
      const service = TestBed.inject(PredictorWorkspaceActionsService);
      const execute = deferNextReadingCommand();
      const source = readings()[0];
      const saving = service.updatePredictorReading({ ...source, notes: 'Local note' });
      const rejected = expect(saving).rejects.toMatchObject({ code: 'validation-failed' });
      readings.set([{ ...source, ...savedPeriod }]);

      await execute(); await rejected;

      expect(predictorHandler.updatePredictorData).not.toHaveBeenCalled();
    }
  );

  it('merges independent reading edits into a valid saved period after its original month becomes occupied', async () => {
    const service = TestBed.inject(PredictorWorkspaceActionsService);
    const execute = deferNextReadingCommand();
    const source = readings()[0];
    const saving = service.updatePredictorReading({ ...source, notes: 'Local note' });
    readings.set([{ ...source, year: 2027, month: 2, amount: 30, weatherDataChanged: true },
      reading('old-month', 21, source.year, source.month)]);

    await execute(); await saving;

    expect(predictorHandler.updatePredictorData).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      guid: source.guid, year: 2027, month: 2, amount: 30, notes: 'Local note', weatherDataChanged: true
    }), 'account-a');
  });

  it('copies settings into a new identity without copying readings', async () => {
    const copy = await TestBed.inject(PredictorWorkspaceActionsService).copyPredictor(existing);
    expect(copy.guid).not.toBe(existing.guid);
    expect(copy.name).toBe('Production (copy)');
    expect(predictorHandler.createStandardPredictor).toHaveBeenCalledWith(
      expect.objectContaining({ predictor: expect.objectContaining({ guid: copy.guid }) }),
      'account-a'
    );
  });

  it.each([undefined, null, '', '  '])('saves an untyped legacy predictor (%s) as Standard without changing its identity or readings', async type => {
    const legacy = { ...existing, predictorType: type };
    facilityPredictors.set([legacy]); predictors.set([legacy]);
    const before = structuredClone(readings());
    await TestBed.inject(PredictorWorkspaceActionsService).updatePredictor({ ...legacy, predictorType: 'Standard', name: 'Edited' });
    expect(predictorHandler.updateStandardPredictor).toHaveBeenCalledWith(expect.objectContaining({ predictor: expect.objectContaining({ id: existing.id, guid: existing.guid, predictorType: 'Standard', name: 'Edited' }) }), 'account-a');
    expect(readings()).toEqual(before); expect(legacy.predictorType).toBe(type);
  });
  it('copies untyped legacy settings as a new Standard predictor and preserves the source snapshot for reviewed deletion', async () => {
    const legacy = { ...existing, predictorType: undefined }; facilityPredictors.set([legacy]); predictors.set([legacy]);
    const service = TestBed.inject(PredictorWorkspaceActionsService);
    const copy = await service.copyPredictor(legacy);
    expect(copy.predictorType).toBe('Standard'); expect(copy.guid).not.toBe(legacy.guid);
    expect(service.previewDeletion([legacy.guid]).predictors[0].predictorType).toBeUndefined();
  });

  it('deletes readings, analysis references, and the predictor in one command', async () => {
    await TestBed.inject(PredictorWorkspaceActionsService).deletePredictor(existing);
    expect(predictorHandler.deleteStandardPredictor).toHaveBeenCalledWith(expect.objectContaining({
      predictor: expect.objectContaining({ id: 10 }),
      predictorData: [expect.objectContaining({ id: 20 })]
    }), 'account-a');
  });

  it('executes a mixed reviewed deletion through one reload command and rejects stale previews', async () => {
    const weather = { ...existing, id: 11, guid: 'weather', predictorType: 'Weather' };
    facilityPredictors.set([existing, weather]);
    const service = TestBed.inject(PredictorWorkspaceActionsService);
    const reviewed = service.previewDeletion([existing.guid, weather.guid]);
    await service.deletePredictors(reviewed);
    expect(predictorHandler.deletePredictorsWithData).toHaveBeenCalledWith(reviewed, 'account-a');
    const boundary = TestBed.inject(WorkspaceCommandBoundary);
    expect(boundary.execute).toHaveBeenCalledTimes(1);
    expect(boundary.execute).toHaveBeenCalledWith(expect.objectContaining({ changeKind: 'bulk', publication: { mode: 'reload' } }), expect.any(Function));
    readings.set([]);
    await expect(service.deletePredictors(reviewed)).rejects.toMatchObject({ code: 'stale-workspace' });
    expect(boundary.execute).toHaveBeenCalledTimes(1);
  });

  it('reloads authoritative workspace state after an atomic command failure', async () => {
    predictorHandler.createStandardPredictor.mockRejectedValueOnce(new Error('transaction failed'));
    const workspaceService = TestBed.inject(AccountWorkspaceService) as unknown as { reloadActiveWorkspace: ReturnType<typeof vi.fn> };

    await expect(TestBed.inject(PredictorWorkspaceActionsService).copyPredictor(existing)).rejects.toThrow('transaction failed');

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

  it('rejects writes while the workspace is read-only or pending', async () => {
    canWrite.set(false);
    await expect(TestBed.inject(PredictorWorkspaceActionsService).copyPredictor(existing))
      .rejects.toMatchObject({ code: 'workspace-not-ready' });
    canWrite.set(true);
    hasPending.set(true);
    await expect(TestBed.inject(PredictorWorkspaceActionsService).copyPredictor(existing))
      .rejects.toMatchObject({ code: 'workspace-not-ready' });
    expect(predictorHandler.createStandardPredictor).not.toHaveBeenCalled();
  });

  it('rejects a predictor outside the selected facility', async () => {
    facilityPredictors.set([]);

    await expect(TestBed.inject(PredictorWorkspaceActionsService).copyPredictor(existing))
      .rejects.toThrow('selected facility');
    expect(predictorHandler.createStandardPredictor).not.toHaveBeenCalled();
  });

  it('rejects a new reading assigned to another facility', async () => {
    await expect(TestBed.inject(PredictorWorkspaceActionsService).addPredictorReading({
      ...reading('reading-new', 30, 2026, 2),
      id: undefined,
      facilityId: 'facility-b'
    })).rejects.toThrow('active facility');
    expect(predictorHandler.addPredictorData).not.toHaveBeenCalled();
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
    predictors.set([weather]);
    facilityPredictors.set([weather]);

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
    facilityPredictors.set([weather]);
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
      facilityId: 'facility-a',
      weatherStationId: 'station-b',
      sourceWeatherStationId: 'station-a',
      updatePredictors: [expect.objectContaining({ weatherStationId: 'station-b' })]
    }), 'account-a');
  });

  it('commits one station month command after validating current group membership', async () => {
    const weatherA = { ...existing, predictorType: 'Weather', weatherStationId: 'station-a' };
    const weatherB = { ...weatherA, id: 11, guid: 'predictor-b', name: 'Humidity' };
    predictors.set([weatherA, weatherB]);
    facilityPredictors.set([weatherA, weatherB]);
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

function deferNextReadingCommand(): () => Promise<void> {
  let execute!: () => Promise<void>;
  vi.mocked(TestBed.inject(WorkspaceCommandBoundary).execute).mockImplementationOnce((options: any, persist: () => Promise<any>) =>
    new Promise((resolve, reject) => {
      execute = async () => {
        try { resolve({ value: await persist(), change: options }); }
        catch (error) { reject(error); }
      };
    }));
  return () => execute();
}

function reading(guid: string, id: number, year: number, month: number): any {
  return {
    id, guid, predictorId: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a',
    year, month, amount: 1, notes: '', weatherDataWarning: false, weatherOverride: false
  };
}

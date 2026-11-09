import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AnalysisCommandHandler } from './analysis-command-handler.service';
import { getNewAnalysisGroup, IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbPredictor } from '@data/models/idbModels/predictor';

import { AccountWorkspaceStore } from '../account-workspace.store';
import { AccountWorkspaceSnapshot } from '../account-workspace.models';
import { WorkspaceCommandBoundary } from '../workspace-command-boundary.service';
import { upsertWorkspaceRecords } from '../account-workspace-patches';

const ACCOUNT = 'acct-1';
const FACILITY = 'fac-1';

describe('AnalysisCommandHandler', () => {
  function createHandler(facilityAnalyses: Partial<IdbAnalysisItem>[] = []) {
    const analysisDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const accountAnalysisDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const accountWorkspaceStore = { facilityAnalyses: vi.fn().mockReturnValue(facilityAnalyses) };
    const handler = new AnalysisCommandHandler(analysisDb as any, accountAnalysisDb as any, accountWorkspaceStore as any);
    return { handler, analysisDb, accountAnalysisDb, accountWorkspaceStore };
  }

  it('addFacilityAnalysis persists and returns the new analysis', async () => {
    const { handler, analysisDb } = createHandler();
    analysisDb.addWithObservable.mockReturnValue(of({ guid: 'a-1', id: 1 }));
    const result = await handler.addFacilityAnalysis({ guid: 'a-1', accountId: ACCOUNT } as IdbAnalysisItem, ACCOUNT);
    expect(result.id).toBe(1);
  });

  it('updateFacilityAnalysis rejects cross-account analysis', async () => {
    const { handler, analysisDb } = createHandler();
    const item = { guid: 'a-1', accountId: 'other' } as IdbAnalysisItem;
    await expect(handler.updateFacilityAnalysis(item, ACCOUNT)).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(analysisDb.updateWithObservable).not.toHaveBeenCalled();
  });

  it('deleteFacilityAnalysis returns the id and rejects cross-account', async () => {
    const { handler, analysisDb } = createHandler();
    analysisDb.deleteWithObservable.mockReturnValue(of(undefined));
    const result = await handler.deleteFacilityAnalysis({ id: 3, guid: 'a-1', accountId: ACCOUNT } as IdbAnalysisItem, ACCOUNT);
    expect(result).toBe(3);

    await expect(
      handler.deleteFacilityAnalysis({ id: 3, guid: 'a-1', accountId: 'other' } as IdbAnalysisItem, ACCOUNT)
    ).rejects.toMatchObject({ code: 'cross-account-entity' });
  });

  it('addAccountAnalysis persists and returns the new account analysis', async () => {
    const { handler, accountAnalysisDb } = createHandler();
    accountAnalysisDb.addWithObservable.mockReturnValue(of({ guid: 'aa-1', id: 2 }));
    const result = await handler.addAccountAnalysis({ guid: 'aa-1', accountId: ACCOUNT } as IdbAccountAnalysisItem, ACCOUNT);
    expect(result.id).toBe(2);
  });

  it('deleteAccountAnalysis rejects cross-account analysis', async () => {
    const { handler, accountAnalysisDb } = createHandler();
    await expect(
      handler.deleteAccountAnalysis({ id: 4, guid: 'aa-1', accountId: 'other' } as IdbAccountAnalysisItem, ACCOUNT)
    ).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(accountAnalysisDb.deleteWithObservable).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Predictor-analysis compound operations
  // ---------------------------------------------------------------------------

  describe('addAnalysisPredictor', () => {
    it('adds a predictor variable to all facility analysis groups without mutating the original', async () => {
      const group = { predictorVariables: [] };
      const analysisItem = { facilityId: FACILITY, groups: [group] };
      const { handler, analysisDb } = createHandler([analysisItem as any]);
      analysisDb.updateWithObservable.mockReturnValue(of(analysisItem));

      const predictor: Partial<IdbPredictor> = {
        guid: 'p-1', facilityId: FACILITY, name: 'Pred A',
        production: true, productionInAnalysis: true, unit: 'kWh'
      };
      await handler.addAnalysisPredictor(predictor as IdbPredictor);

      expect(analysisDb.updateWithObservable).toHaveBeenCalledTimes(1);
      const persisted = analysisDb.updateWithObservable.mock.calls[0][0];
      expect(persisted.groups[0].predictorVariables).toHaveLength(1);
      expect(persisted.groups[0].predictorVariables[0].id).toBe('p-1');
      // original store item is not mutated
      expect(group.predictorVariables).toHaveLength(0);
    });

    it('does not modify analysis items belonging to a different facility', async () => {
      const group = { predictorVariables: [] };
      const analysisItem = { facilityId: 'other-fac', groups: [group] };
      const { handler, analysisDb } = createHandler([analysisItem as any]);

      await handler.addAnalysisPredictor({ guid: 'p-1', facilityId: FACILITY } as IdbPredictor);

      expect(group.predictorVariables).toHaveLength(0);
      expect(analysisDb.updateWithObservable).not.toHaveBeenCalled();
    });
  });

  describe('updateAnalysisPredictor', () => {
    it('patches predictor name/production/unit in analysis groups without mutating the original', async () => {
      const pVar = { id: 'p-1', name: 'Old', production: false, unit: 'old' };
      const group = { predictorVariables: [pVar], models: undefined };
      const analysisItem = { facilityId: FACILITY, groups: [group] };
      const { handler, analysisDb } = createHandler([analysisItem as any]);
      analysisDb.updateWithObservable.mockReturnValue(of(analysisItem));

      await handler.updateAnalysisPredictor({ guid: 'p-1', facilityId: FACILITY, name: 'New', production: true, unit: 'kWh' } as IdbPredictor);

      expect(analysisDb.updateWithObservable).toHaveBeenCalledTimes(1);
      const persisted = analysisDb.updateWithObservable.mock.calls[0][0];
      expect(persisted.groups[0].predictorVariables[0].name).toBe('New');
      expect(persisted.groups[0].predictorVariables[0].production).toBe(true);
      expect(persisted.groups[0].predictorVariables[0].unit).toBe('kWh');
      // original store item is not mutated
      expect(pVar.name).toBe('Old');
    });
  });

  describe('deleteAnalysisPredictor', () => {
    it('removes the predictor variable from groups without mutating the original', async () => {
      const pVar = { id: 'p-1' };
      const group = { predictorVariables: [pVar], analysisType: 'standard', models: undefined };
      const analysisItem = { facilityId: FACILITY, groups: [group] };
      const { handler, analysisDb } = createHandler([analysisItem as any]);
      analysisDb.updateWithObservable.mockReturnValue(of(analysisItem));

      await handler.deleteAnalysisPredictor({ guid: 'p-1', facilityId: FACILITY } as IdbPredictor);

      expect(analysisDb.updateWithObservable).toHaveBeenCalledTimes(1);
      const persisted = analysisDb.updateWithObservable.mock.calls[0][0];
      expect(persisted.groups[0].predictorVariables).toHaveLength(0);
      // original store item is not mutated
      expect(group.predictorVariables).toHaveLength(1);
    });

    it('clears all regression models when selected model used the deleted predictor', async () => {
      const selectedModel = { modelId: 'm-1', predictorVariables: [{ id: 'p-1' }] };
      const group: any = {
        analysisType: 'regression',
        selectedModelId: 'm-1',
        regressionModelYear: 2023,
        regressionConstant: 1,
        models: [selectedModel],
        predictorVariables: [{ id: 'p-1' }]
      };
      const analysisItem = { facilityId: FACILITY, groups: [group] };
      const { handler, analysisDb } = createHandler([analysisItem as any]);
      analysisDb.updateWithObservable.mockReturnValue(of(analysisItem));

      await handler.deleteAnalysisPredictor({ guid: 'p-1', facilityId: FACILITY } as IdbPredictor);

      const persisted = analysisDb.updateWithObservable.mock.calls[0][0];
      expect(persisted.groups[0].models).toBeUndefined();
      expect(persisted.groups[0].selectedModelId).toBeUndefined();
      expect(persisted.groups[0].regressionModelYear).toBeUndefined();
      // original store item is not mutated
      expect(group.models).toHaveLength(1);
      expect(group.selectedModelId).toBe('m-1');
    });
  });
});


describe('AnalysisCommandHandler queued edits', () => {
  function createContext() {
    const store = new AccountWorkspaceStore();
    const first = makeFacilityAnalysis();
    const second = { ...makeFacilityAnalysis(), id: 2, guid: 'a-2', facilityId: 'fac-2' };
    const accountAnalysis = {
      id: 1, guid: 'aa-1', accountId: ACCOUNT, name: 'Original account analysis', baselineYear: 2020,
      facilityItemsInitialized: true, facilityAnalysisItems: [
        { facilityId: FACILITY, analysisItemId: undefined },
        { facilityId: 'fac-2', analysisItemId: undefined }
      ]
    } as IdbAccountAnalysisItem;
    store.publish({
      account: { id: 1, guid: ACCOUNT },
      facilities: [{ id: 1, guid: FACILITY, accountId: ACCOUNT }, { id: 2, guid: 'fac-2', accountId: ACCOUNT }],
      facilityAnalyses: [first, second], accountAnalyses: [accountAnalysis],
      meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
      accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [],
      energyUseGroups: [], energyUseEquipment: []
    } as unknown as AccountWorkspaceSnapshot);
    const analysisDb = { updateWithObservable: vi.fn((value: IdbAnalysisItem) => of(value)), getStoredByGuid: vi.fn().mockResolvedValue(undefined) };
    const accountAnalysisDb = { updateWithObservable: vi.fn((value: IdbAccountAnalysisItem) => of(value)) };
    const handler = new AnalysisCommandHandler(analysisDb as any, accountAnalysisDb as any, store);
    const workspaceService = { reloadActiveWorkspace: vi.fn() };
    const boundary = new WorkspaceCommandBoundary(store, workspaceService as any);
    const facilityCommand = (persist: () => Promise<IdbAnalysisItem>) => boundary.execute({
      entityKind: 'facilityAnalysis', changeKind: 'update', entityGuid: first.guid, label: 'Saving analysis',
      publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('facilityAnalyses', [value]) }
    }, persist);
    const accountCommand = (persist: () => Promise<IdbAccountAnalysisItem>) => boundary.execute({
      entityKind: 'accountAnalysis', changeKind: 'update', entityGuid: accountAnalysis.guid, label: 'Saving account analysis',
      publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('accountAnalyses', [value]) }
    }, persist);
    return { store, handler, analysisDb, accountAnalysisDb, facilityCommand, accountCommand, workspaceService };
  }

  it('merges delayed setup and predictor edits with current groups and predictor metadata', async () => {
    const { store, handler, analysisDb, facilityCommand, workspaceService } = createContext();
    const pending = new Subject<IdbAnalysisItem>();
    analysisDb.updateWithObservable.mockReturnValueOnce(pending);
    const first = facilityCommand(() => handler.updateFacilityAnalysisFields('a-1', { name: 'Renamed', baselineYear: 2022 }, ACCOUNT));
    const second = facilityCommand(() => handler.updateFacilityAnalysisGroup('a-1', 'group-1', {
      regressionConstant: 8, predictorVariables: [{ id: 'p-1', regressionCoefficient: 9 }]
    }, ACCOUNT));
    await Promise.resolve();
    await Promise.resolve();
    expect(analysisDb.updateWithObservable).toHaveBeenCalledTimes(1);
    expect(store.facilityAnalyses()[0].name).toBe('Original');
    pending.next(analysisDb.updateWithObservable.mock.calls[0][0]);
    pending.complete();
    await Promise.all([first, second]);
    const saved = store.facilityAnalyses()[0];
    expect(saved).toMatchObject({ name: 'Renamed', baselineYear: 2022, isAnalysisVisited: false });
    expect(saved.groups[0]).toMatchObject({ regressionConstant: 8, regressionModelNotes: 'Retained notes' });
    expect(saved.groups[0].predictorVariables).toEqual([
      { id: 'p-1', name: 'Production', production: true, unit: 'tons', productionInAnalysis: true, regressionCoefficient: 9 },
      { id: 'p-2', name: 'Weather', production: false, unit: 'HDD', productionInAnalysis: false, regressionCoefficient: 2 }
    ]);
    expect(saved.groups[1]).toEqual(makeFacilityAnalysis().groups[1]);
    expect(store.revision()).toBe(2);
    expect(workspaceService.reloadActiveWorkspace).not.toHaveBeenCalled();
  });

  it('preserves independent queued facility assignments and account setup edits', async () => {
    const { store, handler, accountAnalysisDb, accountCommand } = createContext();
    const pending = new Subject<IdbAccountAnalysisItem>();
    accountAnalysisDb.updateWithObservable.mockReturnValueOnce(pending);
    const first = accountCommand(() => handler.updateAccountFacilityAssignments('aa-1', [{ facilityId: FACILITY, analysisItemId: 'a-1' }], ACCOUNT));
    const second = accountCommand(() => handler.updateAccountAnalysisFields('aa-1', { name: 'New name', baselineYear: 2021 }, ACCOUNT));
    const third = accountCommand(() => handler.updateAccountFacilityAssignments('aa-1', [{ facilityId: 'fac-2', analysisItemId: 'a-2' }], ACCOUNT));
    await Promise.resolve();
    await Promise.resolve();
    pending.next(accountAnalysisDb.updateWithObservable.mock.calls[0][0]);
    pending.complete();
    await Promise.all([first, second, third]);
    expect(store.accountAnalyses()[0]).toMatchObject({
      name: 'New name', baselineYear: 2021, isAnalysisVisited: false,
      facilityAnalysisItems: [{ facilityId: FACILITY, analysisItemId: 'a-1' }, { facilityId: 'fac-2', analysisItemId: 'a-2' }]
    });
    await accountCommand(() => handler.updateAccountFacilityAssignments('aa-1', [
      { facilityId: FACILITY, analysisItemId: undefined }, { facilityId: 'fac-2', analysisItemId: undefined }
    ], ACCOUNT, { facilityItemsInitialized: false }));
    expect(store.accountAnalyses()[0]).toMatchObject({
      name: 'New name', facilityItemsInitialized: false,
      facilityAnalysisItems: [{ facilityId: FACILITY, analysisItemId: undefined }, { facilityId: 'fac-2', analysisItemId: undefined }]
    });
  });

  it('keeps the committed snapshot after failure and allows a later queued edit', async () => {
    const { store, handler, analysisDb, facilityCommand } = createContext();
    analysisDb.updateWithObservable.mockReturnValueOnce(throwError(() => new Error('Disk unavailable')));
    const first = facilityCommand(() => handler.updateFacilityAnalysisFields('a-1', { name: 'Failed name' }, ACCOUNT));
    const failure = expect(first).rejects.toMatchObject({ code: 'persistence-failed' });
    const second = facilityCommand(() => handler.updateFacilityAnalysisGroup('a-1', 'group-1', { regressionConstant: 42 }, ACCOUNT));
    await failure;
    await second;
    expect(store.facilityAnalyses()[0]).toMatchObject({ name: 'Original' });
    expect(store.facilityAnalyses()[0].groups[0].regressionConstant).toBe(42);
    expect(store.revision()).toBe(1);
    expect(store.hasPending()).toBe(false);
  });

  it('rejects missing analysis, group, predictor and facility owners before writing', async () => {
    const { store, handler, analysisDb, accountAnalysisDb } = createContext();
    await expect(handler.updateFacilityAnalysisFields('missing', { name: 'Changed' }, ACCOUNT)).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(handler.updateAccountAnalysisFields('missing', { name: 'Changed' }, ACCOUNT)).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(handler.updateFacilityAnalysisGroup('a-1', 'missing', {}, ACCOUNT)).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(handler.updateFacilityAnalysisGroup('a-1', 'group-1', { predictorVariables: [{ id: 'missing', regressionCoefficient: 5 }] }, ACCOUNT)).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(handler.updateAccountFacilityAssignments('aa-1', [{ facilityId: 'missing', analysisItemId: 'skip' }], ACCOUNT)).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(handler.updateAccountFacilityAssignments('aa-1', [{ facilityId: FACILITY, analysisItemId: 'a-2' }], ACCOUNT)).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(handler.updateAccountFacilityAssignments('aa-1', [{ facilityId: FACILITY, analysisItemId: 'deleted-analysis' }], ACCOUNT)).rejects.toMatchObject({ code: 'validation-failed' });
    store.publish({ ...store.snapshot()!, facilities: [] });
    await expect(handler.updateFacilityAnalysisFields('a-1', { name: 'Changed' }, ACCOUNT)).rejects.toMatchObject({ code: 'validation-failed' });
    expect(analysisDb.updateWithObservable).not.toHaveBeenCalled();
    expect(accountAnalysisDb.updateWithObservable).not.toHaveBeenCalled();
  });

  it('clears models from current groups while retaining notes and predictor metadata', async () => {
    const { store, handler, facilityCommand } = createContext();
    await facilityCommand(() => handler.clearFacilityAnalysisModels('a-1', ACCOUNT, { name: 'Changed setup', baselineYear: 2022 }));
    const saved = store.facilityAnalyses()[0];
    expect(saved).toMatchObject({ name: 'Changed setup', baselineYear: 2022, isAnalysisVisited: false });
    expect(saved.groups.every(group => group.models?.length === 0 && group.regressionConstant === undefined)).toBe(true);
    expect(saved.groups[0].regressionModelNotes).toBe('Retained notes');
    expect(saved.groups[0].predictorVariables[0]).toMatchObject({ name: 'Production', unit: 'tons', regressionCoefficient: undefined });
  });
});

function makeFacilityAnalysis(): IdbAnalysisItem {
  const firstGroup = getNewAnalysisGroup('group-1', [
    { id: 'p-1', name: 'Production', production: true, unit: 'tons', productionInAnalysis: true, regressionCoefficient: 1 },
    { id: 'p-2', name: 'Weather', production: false, unit: 'HDD', productionInAnalysis: false, regressionCoefficient: 2 }
  ]);
  return {
    id: 1, guid: 'a-1', accountId: ACCOUNT, facilityId: FACILITY, name: 'Original', baselineYear: 2020,
    isAnalysisVisited: true,
    groups: [{ ...firstGroup, regressionConstant: 3, regressionModelNotes: 'Retained notes' }, getNewAnalysisGroup('group-2', [])]
  } as IdbAnalysisItem;
}

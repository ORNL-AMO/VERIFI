import { of } from 'rxjs';
import { vi } from 'vitest';
import { AnalysisCommandHandler } from './analysis-command-handler.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbPredictor } from '@data/models/idbModels/predictor';

const ACCOUNT = 'acct-1';
const FACILITY = 'fac-1';

describe('AnalysisCommandHandler', () => {
  function createHandler(facilityAnalyses: Partial<IdbAnalysisItem>[] = []) {
    const analysisDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const accountAnalysisDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const accountWorkspaceStore = { facilityAnalyses: vi.fn().mockReturnValue(facilityAnalyses) };
    const transactions = { runTransaction: vi.fn() };
    const handler = new AnalysisCommandHandler(analysisDb as any, accountAnalysisDb as any, accountWorkspaceStore as any, transactions as any);
    return { handler, analysisDb, accountAnalysisDb, accountWorkspaceStore, transactions };
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

  it('deletes a facility analysis and clears active and account-analysis references atomically', async () => {
    const { handler, transactions } = createHandler();
    const context = {
      getAllByIndex: vi.fn()
        .mockResolvedValueOnce([{ id: 3, guid: 'a-1', accountId: ACCOUNT, facilityId: FACILITY }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 4, guid: FACILITY, accountId: ACCOUNT, selectedEnergyAnalysisId: 'a-1' }])
        .mockResolvedValueOnce([{ id: 5, accountId: ACCOUNT, facilityAnalysisItems: [{ facilityId: FACILITY, analysisItemId: 'a-1' }] }]),
      put: vi.fn().mockResolvedValue(undefined),
      deleteByKey: vi.fn().mockResolvedValue(undefined)
    };
    transactions.runTransaction.mockImplementation(async (_stores, _mode, operation) => operation(context));

    const result = await handler.deleteFacilityAnalysisAtomic({ accountGuid: ACCOUNT, facilityGuid: FACILITY, analysisGuid: 'a-1' });

    expect(result).toMatchObject({ clearedAccountAnalysisCount: 1, clearedActiveSelection: true });
    expect(context.put).toHaveBeenCalledWith('accountAnalysisItems', expect.objectContaining({
      facilityAnalysisItems: [{ facilityId: FACILITY, analysisItemId: undefined }]
    }));
    expect(context.put).toHaveBeenCalledWith('facilities', expect.objectContaining({ selectedEnergyAnalysisId: undefined }));
    expect(context.deleteByKey).toHaveBeenCalledWith('analysisItems', 3);
  });

  it('blocks atomic deletion when reports or banking analyses depend on it', async () => {
    const { handler, transactions } = createHandler();
    const operationWith = (analyses: any[], reports: any[]) => {
      const context = { getAllByIndex: vi.fn().mockResolvedValueOnce(analyses).mockResolvedValueOnce(reports) };
      transactions.runTransaction.mockImplementationOnce(async (_stores, _mode, operation) => operation(context));
    };
    const target = { id: 3, guid: 'a-1', accountId: ACCOUNT, facilityId: FACILITY };
    operationWith([target], [{ analysisItemId: 'a-1' }]);
    await expect(handler.deleteFacilityAnalysisAtomic({ accountGuid: ACCOUNT, facilityGuid: FACILITY, analysisGuid: 'a-1' }))
      .rejects.toThrow('linked facility report');

    operationWith([target, { id: 4, guid: 'a-2', accountId: ACCOUNT, facilityId: FACILITY, bankedAnalysisItemId: 'a-1' }], []);
    await expect(handler.deleteFacilityAnalysisAtomic({ accountGuid: ACCOUNT, facilityGuid: FACILITY, analysisGuid: 'a-1' }))
      .rejects.toThrow('banking workflow');
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

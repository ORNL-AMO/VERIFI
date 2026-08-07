import { of } from 'rxjs';
import { vi } from 'vitest';
import { AnalysisCommandHandler } from './analysis-command-handler.service';
import { IdbAnalysisItem } from '../../models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '../../models/idbModels/accountAnalysisItem';
import { IdbPredictor } from '../../models/idbModels/predictor';

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
    it('adds a predictor variable to all facility analysis groups', async () => {
      const group = { predictorVariables: [] };
      const analysisItem = { facilityId: FACILITY, groups: [group] };
      const { handler, analysisDb } = createHandler([analysisItem as any]);
      analysisDb.updateWithObservable.mockReturnValue(of(analysisItem));

      const predictor: Partial<IdbPredictor> = {
        guid: 'p-1', facilityId: FACILITY, name: 'Pred A',
        production: true, productionInAnalysis: true, unit: 'kWh'
      };
      await handler.addAnalysisPredictor(predictor as IdbPredictor);

      expect(group.predictorVariables).toHaveLength(1);
      expect(group.predictorVariables[0].id).toBe('p-1');
      expect(analysisDb.updateWithObservable).toHaveBeenCalledTimes(1);
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
    it('patches predictor name/production/unit in analysis groups', async () => {
      const pVar = { id: 'p-1', name: 'Old', production: false, unit: 'old' };
      const group = { predictorVariables: [pVar], models: undefined };
      const analysisItem = { facilityId: FACILITY, groups: [group] };
      const { handler, analysisDb } = createHandler([analysisItem as any]);
      analysisDb.updateWithObservable.mockReturnValue(of(analysisItem));

      await handler.updateAnalysisPredictor({ guid: 'p-1', facilityId: FACILITY, name: 'New', production: true, unit: 'kWh' } as IdbPredictor);

      expect(pVar.name).toBe('New');
      expect(pVar.production).toBe(true);
      expect(pVar.unit).toBe('kWh');
    });
  });

  describe('deleteAnalysisPredictor', () => {
    it('removes the predictor variable from groups', async () => {
      const pVar = { id: 'p-1' };
      const group = { predictorVariables: [pVar], analysisType: 'standard', models: undefined };
      const analysisItem = { facilityId: FACILITY, groups: [group] };
      const { handler, analysisDb } = createHandler([analysisItem as any]);
      analysisDb.updateWithObservable.mockReturnValue(of(analysisItem));

      await handler.deleteAnalysisPredictor({ guid: 'p-1', facilityId: FACILITY } as IdbPredictor);

      expect(group.predictorVariables).toHaveLength(0);
      expect(analysisDb.updateWithObservable).toHaveBeenCalledTimes(1);
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

      expect(group.models).toBeUndefined();
      expect(group.selectedModelId).toBeUndefined();
      expect(group.regressionModelYear).toBeUndefined();
    });
  });
});

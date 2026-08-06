import { of } from 'rxjs';
import { vi } from 'vitest';
import { AnalysisCommandHandler } from './analysis-command-handler.service';
import { IdbAnalysisItem } from '../../models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '../../models/idbModels/accountAnalysisItem';

const ACCOUNT = 'acct-1';

describe('AnalysisCommandHandler', () => {
  function createHandler() {
    const analysisDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const accountAnalysisDb = { addWithObservable: vi.fn(), updateWithObservable: vi.fn(), deleteWithObservable: vi.fn() };
    const handler = new AnalysisCommandHandler(analysisDb as any, accountAnalysisDb as any);
    return { handler, analysisDb, accountAnalysisDb };
  }

  it('addFacilityAnalysis persists and returns the new analysis', async () => {
    const { handler, analysisDb } = createHandler();
    analysisDb.addWithObservable.mockReturnValue(of({ guid: 'a-1', id: 1 }));
    const result = await handler.addFacilityAnalysis({ guid: 'a-1', accountId: ACCOUNT } as IdbAnalysisItem);
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
    const result = await handler.addAccountAnalysis({ guid: 'aa-1', accountId: ACCOUNT } as IdbAccountAnalysisItem);
    expect(result.id).toBe(2);
  });

  it('deleteAccountAnalysis rejects cross-account analysis', async () => {
    const { handler, accountAnalysisDb } = createHandler();
    await expect(
      handler.deleteAccountAnalysis({ id: 4, guid: 'aa-1', accountId: 'other' } as IdbAccountAnalysisItem, ACCOUNT)
    ).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(accountAnalysisDb.deleteWithObservable).not.toHaveBeenCalled();
  });
});

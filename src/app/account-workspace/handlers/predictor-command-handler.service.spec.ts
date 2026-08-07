import { of } from 'rxjs';
import { vi } from 'vitest';
import { PredictorCommandHandler } from './predictor-command-handler.service';
import { IdbPredictor } from '../../models/idbModels/predictor';
import { IdbPredictorData } from '../../models/idbModels/predictorData';

const ACCOUNT = 'acct-1';

describe('PredictorCommandHandler', () => {
  function createHandler() {
    const predictorDb = {
      addWithObservable: vi.fn(),
      updateWithObservable: vi.fn(),
      deleteWithObservable: vi.fn()
    };
    const predictorDataDb = {
      addWithObservable: vi.fn(),
      updateWithObservable: vi.fn(),
      deleteIndexWithObservable: vi.fn(),
      deleteAllFacilityPredictorData: vi.fn()
    };
    const transactions = {
      runTransaction: vi.fn()
    };
    const handler = new PredictorCommandHandler(predictorDb as any, predictorDataDb as any, transactions as any);
    return { handler, predictorDb, predictorDataDb, transactions };
  }

  it('addPredictor persists and returns the new predictor', async () => {
    const { handler, predictorDb } = createHandler();
    predictorDb.addWithObservable.mockReturnValue(of({ guid: 'p-1', id: 1 }));

    const result = await handler.addPredictor({ guid: 'p-1', accountId: ACCOUNT } as IdbPredictor, ACCOUNT);
    expect(result.id).toBe(1);
  });

  it('updatePredictor rejects cross-account predictor', async () => {
    const { handler, predictorDb } = createHandler();
    const predictor = { guid: 'p-1', accountId: 'other' } as IdbPredictor;

    await expect(handler.updatePredictor(predictor, ACCOUNT)).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(predictorDb.updateWithObservable).not.toHaveBeenCalled();
  });

  it('deletePredictor returns the predictor id', async () => {
    const { handler, predictorDb } = createHandler();
    predictorDb.deleteWithObservable.mockReturnValue(of(undefined));

    const result = await handler.deletePredictor({ id: 5, guid: 'p-1', accountId: ACCOUNT } as IdbPredictor, ACCOUNT);
    expect(result).toBe(5);
  });

  it('deletePredictor rejects cross-account predictor', async () => {
    const { handler, predictorDb } = createHandler();

    await expect(
      handler.deletePredictor({ id: 5, guid: 'p-1', accountId: 'other' } as IdbPredictor, ACCOUNT)
    ).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(predictorDb.deleteWithObservable).not.toHaveBeenCalled();
  });

  it('replaceFacilityPredictorData deletes existing then inserts new entries', async () => {
    const { handler, predictorDataDb } = createHandler();
    predictorDataDb.deleteAllFacilityPredictorData.mockResolvedValue(undefined);
    predictorDataDb.addWithObservable.mockImplementation((d: IdbPredictorData) => of({ ...d, id: 99 }));

    const newData: IdbPredictorData[] = [
      { guid: 'd-1', accountId: ACCOUNT, facilityId: 'fac-1' } as IdbPredictorData
    ];
    const result = await handler.replaceFacilityPredictorData('fac-1', newData, ACCOUNT);

    expect(predictorDataDb.deleteAllFacilityPredictorData).toHaveBeenCalledWith('fac-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(99);
  });

  it('replaceFacilityPredictorData rejects cross-account entries', async () => {
    const { handler, predictorDataDb } = createHandler();
    const newData: IdbPredictorData[] = [
      { guid: 'd-1', accountId: 'other', facilityId: 'fac-1' } as IdbPredictorData
    ];

    await expect(handler.replaceFacilityPredictorData('fac-1', newData, ACCOUNT)).rejects.toMatchObject({
      code: 'cross-account-entity'
    });
    expect(predictorDataDb.deleteAllFacilityPredictorData).not.toHaveBeenCalled();
  });
});

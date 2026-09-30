import { of } from 'rxjs';
import { vi } from 'vitest';
import { PredictorCommandHandler } from './predictor-command-handler.service';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';

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

  it('creates a standard predictor and its analysis references in one transaction', async () => {
    const { handler, transactions } = createHandler();
    const transaction = {
      add: vi.fn(async () => 12), put: vi.fn(async () => 4), deleteByKey: vi.fn(async () => undefined)
    };
    transactions.runTransaction.mockImplementation(
      async (_stores: unknown, _mode: unknown, work: (value: unknown) => Promise<void>) => work(transaction)
    );
    const predictor = {
      guid: 'p-1', accountId: ACCOUNT, facilityId: 'fac-1', predictorType: 'Standard'
    } as IdbPredictor;
    const analysis = { id: 4, guid: 'a-1', accountId: ACCOUNT, facilityId: 'fac-1' } as any;

    const result = await handler.createStandardPredictor({ predictor, facilityAnalyses: [analysis] }, ACCOUNT);

    expect(result.id).toBe(12);
    expect(transactions.runTransaction).toHaveBeenCalledWith(
      ['predictor', 'analysisItems'], 'readwrite', expect.any(Function)
    );
    expect(transaction.add).toHaveBeenCalledWith('predictor', predictor);
    expect(transaction.put).toHaveBeenCalledWith('analysisItems', expect.objectContaining({ id: 4 }));
  });

  it('rejects standard predictor analysis changes from another facility', async () => {
    const { handler, transactions } = createHandler();
    const predictor = {
      guid: 'p-1', accountId: ACCOUNT, facilityId: 'fac-1', predictorType: 'Standard'
    } as IdbPredictor;
    const analysis = { id: 4, guid: 'a-1', accountId: ACCOUNT, facilityId: 'fac-2' } as any;

    await expect(handler.createStandardPredictor({ predictor, facilityAnalyses: [analysis] }, ACCOUNT))
      .rejects.toMatchObject({ code: 'validation-failed' });
    expect(transactions.runTransaction).not.toHaveBeenCalled();
  });

  it('updates a standard predictor and its analysis references in one transaction', async () => {
    const { handler, transactions } = createHandler();
    const transaction = {
      add: vi.fn(async () => 12), put: vi.fn(async () => 4), deleteByKey: vi.fn(async () => undefined)
    };
    transactions.runTransaction.mockImplementation(
      async (_stores: unknown, _mode: unknown, work: (value: unknown) => Promise<void>) => work(transaction)
    );
    const predictor = {
      id: 3, guid: 'p-1', accountId: ACCOUNT, facilityId: 'fac-1', predictorType: 'Standard'
    } as IdbPredictor;
    const analysis = { id: 4, guid: 'a-1', accountId: ACCOUNT, facilityId: 'fac-1' } as any;

    await handler.updateStandardPredictor({ predictor, facilityAnalyses: [analysis] }, ACCOUNT);

    expect(transactions.runTransaction).toHaveBeenCalledWith(
      ['predictor', 'analysisItems'], 'readwrite', expect.any(Function)
    );
    expect(transaction.put).toHaveBeenCalledWith('predictor', expect.objectContaining({ id: 3 }));
    expect(transaction.put).toHaveBeenCalledWith('analysisItems', expect.objectContaining({ id: 4 }));
  });

  it('deletes a standard predictor, its readings, and analysis references in one transaction', async () => {
    const { handler, transactions } = createHandler();
    const transaction = {
      add: vi.fn(async () => 12), put: vi.fn(async () => 4), deleteByKey: vi.fn(async () => undefined)
    };
    transactions.runTransaction.mockImplementation(
      async (_stores: unknown, _mode: unknown, work: (value: unknown) => Promise<void>) => work(transaction)
    );
    const predictor = {
      id: 3, guid: 'p-1', accountId: ACCOUNT, facilityId: 'fac-1', predictorType: 'Standard'
    } as IdbPredictor;
    const predictorData = {
      id: 7, guid: 'd-1', predictorId: 'p-1', accountId: ACCOUNT, facilityId: 'fac-1'
    } as IdbPredictorData;
    const analysis = { id: 4, guid: 'a-1', accountId: ACCOUNT, facilityId: 'fac-1' } as any;

    await handler.deleteStandardPredictor({ predictor, predictorData: [predictorData], facilityAnalyses: [analysis] }, ACCOUNT);

    expect(transactions.runTransaction).toHaveBeenCalledWith(
      ['predictor', 'predictorData', 'analysisItems'], 'readwrite', expect.any(Function)
    );
    expect(transaction.deleteByKey).toHaveBeenCalledWith('predictorData', 7);
    expect(transaction.deleteByKey).toHaveBeenCalledWith('predictor', 3);
    expect(transaction.put).toHaveBeenCalledWith('analysisItems', expect.objectContaining({ id: 4 }));
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

  it('updates weather settings, readings, and analyses in one transaction', async () => {
    const { handler, transactions } = createHandler();
    const transaction = { put: vi.fn(async () => undefined), add: vi.fn(async () => undefined), deleteByKey: vi.fn(async () => undefined) };
    transactions.runTransaction.mockImplementation(async (_stores: unknown, _mode: unknown, work: (value: unknown) => Promise<void>) => work(transaction));
    const predictor = {
      id: 1, guid: 'p-1', accountId: ACCOUNT, facilityId: 'fac-1',
      predictorType: 'Weather', weatherStationId: 'station-a'
    } as IdbPredictor;
    const updated = {
      id: 2, guid: 'd-1', predictorId: 'p-1', accountId: ACCOUNT, facilityId: 'fac-1'
    } as IdbPredictorData;
    const added = {
      guid: 'd-2', predictorId: 'p-1', accountId: ACCOUNT, facilityId: 'fac-1'
    } as IdbPredictorData;
    const deleted = {
      id: 3, guid: 'd-3', predictorId: 'p-1', accountId: ACCOUNT, facilityId: 'fac-1'
    } as IdbPredictorData;
    const analysis = { id: 4, guid: 'a-1', accountId: ACCOUNT, facilityId: 'fac-1' } as any;

    await handler.updateWeatherPredictor({
      predictor,
      predictorData: { add: [added], update: [updated], delete: [deleted] },
      facilityAnalyses: [analysis]
    }, ACCOUNT);

    expect(transactions.runTransaction).toHaveBeenCalledWith(
      ['predictor', 'predictorData', 'analysisItems'], 'readwrite', expect.any(Function)
    );
    expect(transaction.deleteByKey).toHaveBeenCalledWith('predictorData', 3);
    expect(transaction.add).toHaveBeenCalledWith('predictorData', expect.objectContaining({ guid: 'd-2' }));
    expect(transaction.put).toHaveBeenCalledWith('analysisItems', expect.objectContaining({ id: 4 }));
  });

  it('rejects weather settings records from another facility before opening a transaction', async () => {
    const { handler, transactions } = createHandler();
    const predictor = {
      id: 1, guid: 'p-1', accountId: ACCOUNT, facilityId: 'fac-1',
      predictorType: 'Weather', weatherStationId: 'station-a'
    } as IdbPredictor;
    const entry = {
      guid: 'd-1', predictorId: 'p-1', accountId: ACCOUNT, facilityId: 'fac-2'
    } as IdbPredictorData;

    await expect(handler.updateWeatherPredictor({
      predictor,
      predictorData: { add: [entry], update: [], delete: [] },
      facilityAnalyses: []
    }, ACCOUNT)).rejects.toMatchObject({ code: 'validation-failed' });

    expect(transactions.runTransaction).not.toHaveBeenCalled();
  });

  it('creates weather predictors, readings, and analysis references in one transaction', async () => {
    const { handler, transactions } = createHandler();
    const transaction = { put: vi.fn(async () => undefined), add: vi.fn(async () => undefined), deleteByKey: vi.fn(async () => undefined) };
    transactions.runTransaction.mockImplementation(async (_stores: unknown, _mode: unknown, work: (value: unknown) => Promise<void>) => work(transaction));
    const predictor = { guid: 'p-1', accountId: ACCOUNT } as IdbPredictor;
    const existingPredictor = { id: 2, guid: 'p-2', accountId: ACCOUNT } as IdbPredictor;
    const entry = { guid: 'd-1', predictorId: 'p-1', accountId: ACCOUNT } as IdbPredictorData;
    const analysis = { id: 4, guid: 'a-1', accountId: ACCOUNT } as any;

    await handler.createWeatherPredictors({
      predictors: [predictor, existingPredictor], predictorData: [entry], facilityAnalyses: [analysis]
    }, ACCOUNT);

    expect(transactions.runTransaction).toHaveBeenCalledWith(
      ['predictor', 'predictorData', 'analysisItems'], 'readwrite', expect.any(Function)
    );
    expect(transaction.add).toHaveBeenCalledWith('predictor', expect.objectContaining({ guid: 'p-1' }));
    expect(transaction.put).toHaveBeenCalledWith('predictor', expect.objectContaining({ guid: 'p-2' }));
    expect(transaction.add).toHaveBeenCalledWith('predictorData', expect.objectContaining({ guid: 'd-1' }));
    expect(transaction.put).toHaveBeenCalledWith('analysisItems', expect.objectContaining({ id: 4 }));
  });

  it('applies a weather station group change in one transaction', async () => {
    const { handler, transactions } = createHandler();
    const transaction = { put: vi.fn(async () => undefined), add: vi.fn(async () => undefined), deleteByKey: vi.fn(async () => undefined) };
    transactions.runTransaction.mockImplementation(async (_stores: unknown, _mode: unknown, work: (value: unknown) => Promise<void>) => work(transaction));
    const station = { accountId: ACCOUNT, facilityId: 'fac-1', predictorType: 'Weather', weatherStationId: 'station-a' };
    const added = { ...station, guid: 'p-new' } as IdbPredictor;
    const updated = { ...station, id: 2, guid: 'p-update' } as IdbPredictor;
    const deleted = { ...station, id: 3, guid: 'p-delete' } as IdbPredictor;
    const addedReading = {
      guid: 'd-new', predictorId: 'p-new', accountId: ACCOUNT, facilityId: 'fac-1'
    } as IdbPredictorData;
    const deletedReading = {
      id: 4, guid: 'd-delete', predictorId: 'p-delete', accountId: ACCOUNT, facilityId: 'fac-1'
    } as IdbPredictorData;
    const analysis = { id: 5, guid: 'a-1', accountId: ACCOUNT, facilityId: 'fac-1' } as any;

    await handler.applyWeatherStationGroup({
      facilityId: 'fac-1', weatherStationId: 'station-a', sourceWeatherStationId: 'station-a',
      addPredictors: [added], updatePredictors: [updated], deletePredictors: [deleted],
      predictorData: { add: [addedReading], update: [], delete: [deletedReading] },
      facilityAnalyses: [analysis]
    }, ACCOUNT);

    expect(transactions.runTransaction).toHaveBeenCalledWith(
      ['predictor', 'predictorData', 'analysisItems'], 'readwrite', expect.any(Function)
    );
    expect(transaction.deleteByKey).toHaveBeenCalledWith('predictor', 3);
    expect(transaction.deleteByKey).toHaveBeenCalledWith('predictorData', 4);
    expect(transaction.put).toHaveBeenCalledWith('predictor', expect.objectContaining({ guid: 'p-update' }));
    expect(transaction.add).toHaveBeenCalledWith('predictor', expect.objectContaining({ guid: 'p-new' }));
    expect(transaction.put).toHaveBeenCalledWith('analysisItems', expect.objectContaining({ id: 5 }));
  });

  it('rejects a weather station predictor from another facility before opening a transaction', async () => {
    const { handler, transactions } = createHandler();
    const predictor = {
      guid: 'p-new', accountId: ACCOUNT, facilityId: 'fac-2',
      predictorType: 'Weather', weatherStationId: 'station-a'
    } as IdbPredictor;

    await expect(handler.applyWeatherStationGroup({
      facilityId: 'fac-1', weatherStationId: 'station-a', sourceWeatherStationId: undefined,
      addPredictors: [predictor], updatePredictors: [], deletePredictors: [],
      predictorData: { add: [], update: [], delete: [] }, facilityAnalyses: []
    }, ACCOUNT)).rejects.toMatchObject({ code: 'validation-failed' });

    expect(transactions.runTransaction).not.toHaveBeenCalled();
  });

  it('rejects weather station data and analyses from another facility before opening a transaction', async () => {
    const { handler, transactions } = createHandler();
    const predictor = {
      guid: 'p-new', accountId: ACCOUNT, facilityId: 'fac-1',
      predictorType: 'Weather', weatherStationId: 'station-a'
    } as IdbPredictor;
    const reading = {
      guid: 'd-new', predictorId: 'p-new', accountId: ACCOUNT, facilityId: 'fac-2'
    } as IdbPredictorData;
    const analysis = {
      id: 5, guid: 'a-1', accountId: ACCOUNT, facilityId: 'fac-2'
    } as any;

    await expect(handler.applyWeatherStationGroup({
      facilityId: 'fac-1', weatherStationId: 'station-a', sourceWeatherStationId: undefined,
      addPredictors: [predictor], updatePredictors: [], deletePredictors: [],
      predictorData: { add: [reading], update: [], delete: [] }, facilityAnalyses: []
    }, ACCOUNT)).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(handler.applyWeatherStationGroup({
      facilityId: 'fac-1', weatherStationId: 'station-a', sourceWeatherStationId: undefined,
      addPredictors: [predictor], updatePredictors: [], deletePredictors: [],
      predictorData: { add: [], update: [], delete: [] }, facilityAnalyses: [analysis]
    }, ACCOUNT)).rejects.toMatchObject({ code: 'validation-failed' });

    expect(transactions.runTransaction).not.toHaveBeenCalled();
  });

  it('rejects predictors outside the reviewed target or source weather station', async () => {
    const { handler, transactions } = createHandler();
    const added = {
      guid: 'p-new', accountId: ACCOUNT, facilityId: 'fac-1',
      predictorType: 'Weather', weatherStationId: 'station-b'
    } as IdbPredictor;
    const deleted = {
      id: 2, guid: 'p-old', accountId: ACCOUNT, facilityId: 'fac-1',
      predictorType: 'Weather', weatherStationId: 'station-c'
    } as IdbPredictor;

    await expect(handler.applyWeatherStationGroup({
      facilityId: 'fac-1', weatherStationId: 'station-a', sourceWeatherStationId: 'station-old',
      addPredictors: [added], updatePredictors: [], deletePredictors: [],
      predictorData: { add: [], update: [], delete: [] }, facilityAnalyses: []
    }, ACCOUNT)).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(handler.applyWeatherStationGroup({
      facilityId: 'fac-1', weatherStationId: 'station-a', sourceWeatherStationId: 'station-old',
      addPredictors: [], updatePredictors: [], deletePredictors: [deleted],
      predictorData: { add: [], update: [], delete: [] }, facilityAnalyses: []
    }, ACCOUNT)).rejects.toMatchObject({ code: 'validation-failed' });

    expect(transactions.runTransaction).not.toHaveBeenCalled();
  });

  it('applies multi-predictor station month changes in one predictor-data transaction', async () => {
    const { handler, transactions } = createHandler();
    const transaction = { put: vi.fn(async () => undefined), add: vi.fn(async () => undefined), deleteByKey: vi.fn(async () => undefined) };
    transactions.runTransaction.mockImplementation(async (_stores: unknown, _mode: unknown, work: (value: unknown) => Promise<void>) => work(transaction));
    const shared = { accountId: ACCOUNT, facilityId: 'fac-1', year: 2026, month: 2 };
    const added = { ...shared, guid: 'new', predictorId: 'p-2' } as IdbPredictorData;
    const updated = { ...shared, id: 2, guid: 'update', predictorId: 'p-1' } as IdbPredictorData;
    const deleted = { ...shared, id: 3, guid: 'delete', predictorId: 'p-2' } as IdbPredictorData;

    await handler.applyWeatherStationMonth({
      facilityId: 'fac-1', predictorGuids: ['p-1', 'p-2'], year: 2026, month: 2,
      add: [added], update: [updated], delete: [deleted]
    }, ACCOUNT);

    expect(transactions.runTransaction).toHaveBeenCalledWith(['predictorData'], 'readwrite', expect.any(Function));
    expect(transaction.deleteByKey).toHaveBeenCalledWith('predictorData', 3);
    expect(transaction.put).toHaveBeenCalledWith('predictorData', expect.objectContaining({ guid: 'update' }));
    expect(transaction.add).toHaveBeenCalledWith('predictorData', expect.objectContaining({ guid: 'new' }));
  });

  it('rejects station month records outside the reviewed month before opening a transaction', async () => {
    const { handler, transactions } = createHandler();
    await expect(handler.applyWeatherStationMonth({
      facilityId: 'fac-1', predictorGuids: ['p-1'], year: 2026, month: 2,
      add: [{ guid: 'new', predictorId: 'p-1', accountId: ACCOUNT, facilityId: 'fac-1', year: 2026, month: 3 } as IdbPredictorData],
      update: [], delete: []
    }, ACCOUNT)).rejects.toMatchObject({ code: 'validation-failed' });
    expect(transactions.runTransaction).not.toHaveBeenCalled();
  });
});

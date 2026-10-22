import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { IndexedDbTransactionContext } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness, IndexedDbTestRecord } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { PredictorCommandHandler, PredictorDeletionPreview } from './predictor-command-handler.service';

describe('mixed Predictor bulk deletion in Chromium', () => {
  let harness: IndexedDbTestHarness;
  const predictors = [1, 2, 3, 4, 5].map(id => ({ id, guid: `p${id}`, name: `Predictor ${id}`, accountId: id === 5 ? 'other-account' : 'account', facilityId: id >= 4 ? 'other-facility' : 'facility', predictorType: id === 2 || id === 3 ? 'Weather' : 'Standard', weatherStationId: id === 2 || id === 3 ? 'KORD' : undefined } as IdbPredictor));
  const readings = predictors.map(item => ({ id: item.id! + 10, guid: `r${item.id}`, predictorId: item.guid, accountId: item.accountId, facilityId: item.facilityId, year: 2025, month: 1, amount: 0 } as IdbPredictorData));
  const analyses = [{ id: 1, guid: 'a1', name: 'Analysis', accountId: 'account', facilityId: 'facility', groups: [{ id: 'group', analysisType: 'regression', predictorVariables: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }], selectedModelId: 'selected', regressionConstant: 7, models: [{ modelId: 'selected', predictorVariables: [{ id: 'p2' }] }] }] },
    { id: 2, guid: 'a2', accountId: 'account', facilityId: 'other-facility', groups: [] }] as unknown as IdbAnalysisItem[];
  const preview = (guids = ['p1', 'p2']): PredictorDeletionPreview => structuredClone({ facilityGuid: 'facility', predictors: predictors.filter(item => guids.includes(item.guid)), predictorData: readings.filter(item => guids.includes(item.predictorId)), facilityAnalyses: analyses.filter(item => item.facilityId === 'facility') });
  beforeEach(async () => { harness = await IndexedDbTestHarness.create('predictor-bulk-delete'); await harness.seed({ predictor: predictors.map(item => ({ ...item })), predictorData: readings.map(item => ({ ...item })), analysisItems: analyses.map(item => ({ ...item })) }); });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });
  it('atomically deletes mixed predictors, cleans references once and preserves weather siblings after reopening', async () => {
    expect(await TestBed.inject(PredictorCommandHandler).deletePredictorsWithData(preview(), 'account')).toBe(2);
    await harness.reopen(); expect(await harness.getAll('predictor')).toEqual(predictors.slice(2)); expect(await harness.getAll('predictorData')).toEqual(readings.slice(2));
    const saved = await harness.getAll<IdbAnalysisItem & IndexedDbTestRecord>('analysisItems');
    expect(saved[0].groups[0].predictorVariables.map(item => item.id)).toEqual(['p3']);
    expect(saved[0].groups[0].selectedModelId).toBeUndefined(); expect(saved[0].groups[0].models).toBeUndefined(); expect(saved[1]).toEqual(analyses[1]);
  });
  it('updates an untyped legacy predictor through the normal settings transaction and preserves its readings after reopening', async () => {
    const legacy = { ...predictors[0], predictorType: undefined, description: 'Original', customBackupField: 'preserve' };
    await firstValueFrom(harness.dbService.update('predictor', legacy));
    await TestBed.inject(PredictorCommandHandler).updateStandardPredictor({ predictor: { ...legacy, predictorType: 'Standard', name: 'Updated production' }, facilityAnalyses: [] }, 'account');
    await harness.reopen();
    expect((await harness.getAll('predictor'))[0]).toMatchObject({ id: 1, guid: 'p1', predictorType: 'Standard', name: 'Updated production', description: 'Original', customBackupField: 'preserve' });
    expect(await harness.getAll('predictorData')).toEqual(readings); expect(await harness.getAll('analysisItems')).toEqual(analyses);
  });
  it('deletes an untyped legacy predictor using its original reviewed snapshot without changing other records', async () => {
    const reviewed = preview(['p1']);
    const legacy = { ...reviewed.predictors[0], predictorType: undefined };
    await firstValueFrom(harness.dbService.update('predictor', legacy));
    await TestBed.inject(PredictorCommandHandler).deletePredictorsWithData({ ...reviewed, predictors: [legacy] }, 'account');
    await harness.reopen(); expect(await harness.getAll('predictor')).toEqual(predictors.slice(1)); expect(await harness.getAll('predictorData')).toEqual(readings.slice(1));
  });

  it('removes the last station predictors without touching other stations or facilities', async () => {
    await TestBed.inject(PredictorCommandHandler).deletePredictorsWithData(preview(['p2', 'p3']), 'account');
    await harness.reopen(); expect((await harness.getAll<IdbPredictor & IndexedDbTestRecord>('predictor')).map(item => item.guid)).toEqual(['p1', 'p4', 'p5']);
  });
  it('rolls back readings, predictors and analyses when an analysis write fails; retry succeeds', async () => {
    const original = IndexedDbTransactionContext.prototype.put;
    const spy = vi.spyOn(IndexedDbTransactionContext.prototype, 'put').mockImplementation(function (store, value) {
      return store === 'analysisItems' ? Promise.reject(new Error('Injected analysis failure')) : original.call(this, store, value);
    });
    await expect(TestBed.inject(PredictorCommandHandler).deletePredictorsWithData(preview(), 'account')).rejects.toThrow('Injected analysis failure');
    await harness.reopen(); expect(await harness.getAll('predictor')).toEqual(predictors); expect(await harness.getAll('predictorData')).toEqual(readings); expect(await harness.getAll('analysisItems')).toEqual(analyses);
    spy.mockRestore(); await TestBed.inject(PredictorCommandHandler).deletePredictorsWithData(preview(), 'account'); expect(await harness.getAll('predictor')).toHaveLength(3);
  });
  it('rejects stale reading, predictor and analysis snapshots before any deletion', async () => {
    const handler = TestBed.inject(PredictorCommandHandler);
    const missing = preview();
    for (const request of [ { ...missing, predictorData: [] }, { ...missing, predictors: [{ ...missing.predictors[0], name: 'Stale' }] }, { ...missing, facilityAnalyses: [] } ]) {
      await expect(handler.deletePredictorsWithData(request, 'account')).rejects.toBeDefined();
    }
    expect(await harness.getAll('predictor')).toEqual(predictors); expect(await harness.getAll('analysisItems')).toEqual(analyses);
  });
  it('rejects cross-account, cross-facility, duplicate IDs and unrelated readings', async () => {
    const handler = TestBed.inject(PredictorCommandHandler), valid = preview();
    for (const request of [preview(['p5']), preview(['p1', 'p4']), { ...valid, predictors: [valid.predictors[0], valid.predictors[0]] }, { ...valid, predictors: [{ ...valid.predictors[0], id: undefined }] }, { ...valid, predictorData: readings }]) {
      await expect(handler.deletePredictorsWithData(request, 'account')).rejects.toBeDefined();
    }
    expect(await harness.getAll('predictor')).toEqual(predictors);
  });
});

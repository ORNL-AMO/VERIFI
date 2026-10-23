import { vi } from 'vitest';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { buildAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { analysisReviewContent, analysisReviewIsCurrent } from '@domain/reports/analysis-review-inputs';
import { analysisReviewFingerprint } from '@platform/reports/analysis-review-fingerprint';
import { AnalysisReviewCommandHandler } from './analysis-review-command-handler.service';

describe('shared analysis review transactions', () => {
  let harness: IndexedDbTestHarness;
  afterEach(async () => { vi.restoreAllMocks(); await harness?.destroy(); });
  async function setup(single = false) {
    const original = analysisReportFixture();
    const snapshot = { ...original, account: { ...original.account, isSingleFacilityCompany: single } };
    harness = await IndexedDbTestHarness.create('analysis-review');
    await harness.seed({ accounts: [{ ...snapshot.account }], facilities: snapshot.facilities.map(item => ({ ...item })),
      analysisItems: snapshot.facilityAnalyses.map(item => ({ ...item })), accountAnalysisItems: snapshot.accountAnalyses.map(item => ({ ...item })),
      utilityMeter: snapshot.meters.map(item => ({ ...item })), utilityMeterData: snapshot.meterData.map(item => ({ ...item })) });
    const tx = new IndexedDbTransactionService(indexedDB, { default: { ...dbConfig, name: harness.databaseName } });
    return { snapshot, tx, handler: new AnalysisReviewCommandHandler(tx), inputs: buildAnalysisReportInputs(snapshot, 'account-analysis') };
  }
  it.each([false, true])('persists a shared review on the canonical analysis owner and survives reopening (single: %s)', async single => {
    const { handler, inputs } = await setup(single);
    const result = await handler.confirm('account', 'account-analysis', inputs, [2023, 2024]);
    expect(result.scope).toBe(single ? 'facility' : 'account');
    const fingerprint = await analysisReviewFingerprint(analysisReviewContent(inputs, 2023));
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(analysisReviewIsCurrent(result.analysis.dataCheckReviews, 2023, fingerprint)).toBe(true);
    await handler.confirm('account', 'account-analysis', inputs, [2023]);
    await harness.reopen();
    const saved = (await harness.getAll(single ? 'analysisItems' : 'accountAnalysisItems'))[0];
    expect(saved['dataCheckReviews']).toHaveLength(2);
    expect(saved['isAnalysisVisited']).toBe(false);
  });
  it('rejects stale data without writing a confirmation', async () => {
    const { handler, inputs, snapshot, tx } = await setup();
    await tx.runTransaction(['utilityMeterData'], 'readwrite', context => context.put('utilityMeterData', { ...snapshot.meterData[0], totalEnergyUse: 1 }));
    await expect(handler.confirm('account', 'account-analysis', inputs, [2023])).rejects.toThrow('changed during review');
    expect((await harness.getAll('accountAnalysisItems'))[0]['dataCheckReviews']).toBeUndefined();
  });
  it('does not overwrite concurrent metadata edits and rolls back failed confirmation writes', async () => {
    const { handler, inputs, snapshot, tx } = await setup();
    await tx.runTransaction(['accountAnalysisItems'], 'readwrite', context => context.put('accountAnalysisItems', { ...snapshot.accountAnalyses[0], name: 'Renamed elsewhere' }));
    const put = vi.spyOn(IndexedDbTransactionContext.prototype, 'put').mockRejectedValueOnce(new Error('Write failed'));
    await expect(handler.confirm('account', 'account-analysis', inputs, [2023])).rejects.toThrow('Write failed');
    expect((await harness.getAll('accountAnalysisItems'))[0]).toMatchObject({ name: 'Renamed elsewhere' });
    expect((await harness.getAll('accountAnalysisItems'))[0]['dataCheckReviews']).toBeUndefined();
    put.mockRestore();
    expect((await handler.confirm('account', 'account-analysis', inputs, [2023])).analysis.name).toBe('Renamed elsewhere');
  });
  it('rejects foreign owners, missing periods and blocking models', async () => {
    const { handler, inputs } = await setup();
    await expect(handler.confirm('foreign', 'account-analysis', inputs, [2023])).rejects.toThrow('unavailable');
    await expect(handler.confirm('account', 'account-analysis', inputs, [])).rejects.toThrow('unavailable');
    inputs.facilityAnalyses[0].groups[0].analysisType = 'regression';
    await expect(handler.confirm('account', 'account-analysis', inputs, [2023])).rejects.toThrow('blocking analysis issues');
  });
});

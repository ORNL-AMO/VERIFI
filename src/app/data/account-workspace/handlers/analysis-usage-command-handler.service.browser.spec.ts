import { vi } from 'vitest';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { getNewIdbAccountReport, IdbAccountReport } from '@data/models/idbModels/accountReport';
import { getNewIdbFacilityReport, IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { AccountWorkspaceStore } from '../account-workspace.store';
import { WorkspaceCommandBoundary } from '../workspace-command-boundary.service';
import { analysisUsageFixture } from '../testing/analysis-usage-fixtures';
import { AnalysisUsageCommand, analysisUsageSourceKey } from '../analysis-usage.models';
import { ReportCommandHandler } from './report-command-handler.service';
import { AnalysisUsageCommandHandler } from './analysis-usage-command-handler.service';
import { AnalysisCommandHandler } from './analysis-command-handler.service';

describe('Analysis Used By atomic writes in Chromium', () => {
  let harness: IndexedDbTestHarness;
  let f: ReturnType<typeof analysisUsageFixture>;
  let tx: IndexedDbTransactionService;
  let reports: ReportCommandHandler;
  let handler: AnalysisUsageCommandHandler;
  const command = (): AnalysisUsageCommand => ({ source: f.source, expectedSource: analysisUsageSourceKey(f.analysis),
    target: { kind: 'new', guid: 'new-item', name: 'New item' } });

  beforeEach(async () => {
    f = analysisUsageFixture();
    harness = await IndexedDbTestHarness.create('analysis-usage');
    tx = new IndexedDbTransactionService(indexedDB, { default: { ...dbConfig, name: harness.databaseName } });
    reports = new ReportCommandHandler(undefined, undefined, undefined, tx);
    handler = new AnalysisUsageCommandHandler(tx, reports);
    await harness.seed({ accounts: [f.account], facilities: [f.facility, f.other],
      analysisItems: [f.analysis], accountAnalysisItems: [f.accountAnalysis] });
  });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });

  it('creates and preselects an account analysis with one publication and durable GUID links', async () => {
    const store = new AccountWorkspaceStore(); store.publish(f.snapshot);
    const boundary = new WorkspaceCommandBoundary(store, undefined);
    const committed = vi.fn(); boundary.committedChange$.subscribe(committed);
    await boundary.execute({ entityKind: 'accountAnalysis', changeKind: 'add', label: 'Add account analysis',
      publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'accountAnalyses', upsert: value.accountAnalyses }] }) }
    }, () => handler.saveAccountAnalysis(command()));
    expect(store.revision()).toBe(1); expect(committed).toHaveBeenCalledOnce();
    await harness.reopen();
    const saved = (await harness.getAll('accountAnalysisItems')).find(item => item.guid === 'new-item');
    expect(saved).toMatchObject({ name: 'New item', baselineYear: 2022, energyIsSource: true, energyUnit: f.account.energyUnit,
      facilityItemsInitialized: true, facilityAnalysisItems: [
        { facilityId: f.facility.guid, analysisItemId: f.analysis.guid }, { facilityId: f.other.guid, analysisItemId: undefined }
      ] });
    expect(await harness.getAll('analysisItems')).toEqual([f.analysis]);
  });

  it.each(['analysis', 'modeling', 'savings', 'costSavings', 'dataQuality'] as const)('creates a linked facility %s report', async type => {
    if (type === 'costSavings') {
      f.analysis.energyIsSource = false;
      await tx.runTransaction(['analysisItems'], 'readwrite', context => context.put('analysisItems', f.analysis));
    }
    await handler.saveReport({ ...command(), report: { scope: 'facility', type, facilityGuid: f.facility.guid } });
    await harness.reopen();
    const report = (await harness.getAll('facilityReports'))[0] as unknown as IdbFacilityReport;
    expect(report.analysisItemId).toBe(f.analysis.guid);
    if (type === 'dataQuality') expect(report.dataQualityReportSettings).toMatchObject({ selectedMode: 'analysis', selectedAnalysisItemId: f.analysis.guid });
    if (type === 'analysis') expect(report.analysisReportSettings.facilityGroupContributions).toBe(true);
  });

  it.each(['betterPlants', 'performance', 'analysis', 'accountSavings'] as const)('creates a linked account %s report', async type => {
    const result = await handler.saveReport({ ...command(), source: { scope: 'account', accountGuid: f.account.guid, analysisGuid: f.accountAnalysis.guid },
      expectedSource: analysisUsageSourceKey(f.accountAnalysis), report: { scope: 'account', type } });
    const report = result.accountReports[0];
    const key = { betterPlants: 'betterPlantsReportSetup', performance: 'performanceReportSetup', analysis: 'analysisReportSetup', accountSavings: 'accountSavingsReportSetup' }[type];
    expect((report[key as keyof IdbAccountReport] as { analysisItemId: string }).analysisItemId).toBe(f.accountAnalysis.guid);
  });

  it('atomically creates an account-format report and hidden pair in a single-facility workspace', async () => {
    await tx.runTransaction(['accounts', 'facilities', 'accountAnalysisItems'], 'readwrite', async context => {
      await context.put('accounts', { ...f.account, isSingleFacilityCompany: true });
      await context.deleteByKey('facilities', f.other.id); await context.deleteByKey('accountAnalysisItems', f.accountAnalysis.id);
    });
    const result = await handler.saveReport({ ...command(), report: { scope: 'account', type: 'betterPlants' } });
    expect(result.accountAnalyses).toHaveLength(1);
    expect(result.accountReports[0].betterPlantsReportSetup.analysisItemId).toBe(result.accountAnalyses[0].guid);
    expect(result.accountAnalyses[0].facilityAnalysisItems).toEqual([{ facilityId: f.facility.guid, analysisItemId: f.analysis.guid }]);
  });

  it('rolls back the report and hidden pair if a participant fails after selection', async () => {
    await tx.runTransaction(['accounts', 'facilities', 'accountAnalysisItems'], 'readwrite', async context => {
      await context.put('accounts', { ...f.account, isSingleFacilityCompany: true });
      await context.deleteByKey('facilities', f.other.id); await context.deleteByKey('accountAnalysisItems', f.accountAnalysis.id);
    });
    const apply = reports.applyAccountReportSetup.bind(reports);
    vi.spyOn(reports, 'applyAccountReportSetup').mockImplementation(async (...args) => { await apply(...args); throw new Error('Injected participant failure'); });
    await expect(handler.saveReport({ ...command(), report: { scope: 'account', type: 'betterPlants' } })).rejects.toThrow('Injected participant failure');
    expect(await harness.getAll('accountReports')).toEqual([]);
    expect(await harness.getAll('accountAnalysisItems')).toEqual([]);
  });

  it('rejects a reused creation identity and leaves existing reports and analyses unchanged', async () => {
    const report = { ...getNewIdbAccountReport(f.account, [...f.snapshot.facilities], []), id: 1, reportType: 'betterPlants' as const };
    await harness.seed({ accountReports: [report] });
    await expect(handler.saveAccountAnalysis({ ...command(), target: { kind: 'new', guid: f.accountAnalysis.guid, name: 'Do not overwrite' } })).rejects.toThrow('already been created');
    await expect(handler.saveReport({ source: { scope: 'account', accountGuid: f.account.guid, analysisGuid: f.accountAnalysis.guid },
      expectedSource: analysisUsageSourceKey(f.accountAnalysis), target: { kind: 'new', guid: report.guid, name: 'Do not overwrite' },
      report: { scope: 'account', type: 'betterPlants' } })).rejects.toThrow('already been created');
    expect(await harness.getAll('accountAnalysisItems')).toEqual([f.accountAnalysis]);
    expect(await harness.getAll('accountReports')).toEqual([report]);
  });

  it('rejects source changes and incompatible Cost Savings selections before writing', async () => {
    await expect(handler.saveAccountAnalysis({ ...command(), expectedSource: 'old settings' })).rejects.toMatchObject({ code: 'stale-workspace' });
    await expect(handler.saveReport({ ...command(), report: { scope: 'facility', type: 'costSavings', facilityGuid: f.facility.guid } })).rejects.toMatchObject({ code: 'validation-failed' });
    expect(await harness.getAll('facilityReports')).toEqual([]);
    expect(await harness.getAll('accountAnalysisItems')).toEqual([f.accountAnalysis]);
  });

  it.each(['manual', 'analysis'] as const)('keeps Data Quality %s usage consistent with facility deletion guards', async mode => {
    const report = getNewIdbFacilityReport(f.facility.guid, f.account.guid, 'dataQuality', []);
    report.analysisItemId = mode === 'manual' ? f.analysis.guid : undefined;
    report.dataQualityReportSettings.selectedMode = mode;
    report.dataQualityReportSettings.selectedAnalysisItemId = f.analysis.guid;
    await harness.seed({ facilityReports: [{ ...report }] });
    const deletion = new AnalysisCommandHandler(undefined, undefined, undefined, tx).deleteFacilityAnalysisAtomic({
      accountGuid: f.account.guid, facilityGuid: f.facility.guid, analysisGuid: f.analysis.guid
    });
    if (mode === 'analysis') await expect(deletion).rejects.toThrow('linked facility report');
    else { await deletion; expect(await harness.getAll('analysisItems')).toEqual([]); }
  });
});

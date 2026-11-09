import { firstValueFrom } from 'rxjs';
import { accountAFixture, accountBFixture, twoAccountPersistenceSeed } from '@data/indexedDB/testing/indexed-db-test-fixtures';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IndexedDbAccessService } from '@data/indexedDB/indexed-db-access.service';
import { AnalysisDbService } from '@data/indexedDB/analysis-db.service';
import { AccountAnalysisDbService } from '@data/indexedDB/account-analysis-db.service';
import { getNewAnalysisGroup, IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { AnalysisCommandHandler } from './analysis-command-handler.service';
import { AccountWorkspaceStore } from '../account-workspace.store';
import { AccountWorkspaceSnapshot } from '../account-workspace.models';
import { WorkspaceCommandBoundary } from '../workspace-command-boundary.service';
import { upsertWorkspaceRecords } from '../account-workspace-patches';

describe('Analysis edit merges in Chromium', () => {
  let harness: IndexedDbTestHarness;

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('analysis-edit-merges');
  });

  afterEach(async () => {
    await harness.destroy();
  });

  it('persists queued setup, model and facility-link edits without replacing other saved values after reopen', async () => {
    const facilityAnalysis = {
      ...accountAFixture.facilityAnalysis,
      baselineYear: 2020,
      groups: [getNewAnalysisGroup('meter-group-a', [
        { id: 'predictor-a', name: 'Production', unit: 'tons', production: true, productionInAnalysis: true, regressionCoefficient: 1 }
      ]), { ...getNewAnalysisGroup('other-group', []), regressionModelNotes: 'Keep other group' }]
    } as IdbAnalysisItem;
    const accountAnalysis = {
      ...accountAFixture.accountAnalysis,
      baselineYear: 2020,
      facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: undefined }]
    } as IdbAccountAnalysisItem;
    const seed = {
      ...twoAccountPersistenceSeed,
      analysisItems: [facilityAnalysis, accountBFixture.facilityAnalysis],
      accountAnalysisItems: [accountAnalysis, accountBFixture.accountAnalysis]
    };
    await harness.seed(seed as any);
    const access = new IndexedDbAccessService(harness.dbService);
    const analysisDb = new AnalysisDbService(harness.dbService, access);
    const accountAnalysisDb = new AccountAnalysisDbService(harness.dbService, access);
    const store = new AccountWorkspaceStore();
    store.publish({
      account: accountAFixture.account, facilities: [accountAFixture.facility],
      facilityAnalyses: [facilityAnalysis], accountAnalyses: [accountAnalysis],
      meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
      accountReports: [], facilityReports: [], customEmissions: [], customFuels: [], customGWPs: [],
      energyUseGroups: [], energyUseEquipment: []
    } as unknown as AccountWorkspaceSnapshot);
    const handler = new AnalysisCommandHandler(analysisDb, accountAnalysisDb, store);
    const boundary = new WorkspaceCommandBoundary(store, { reloadActiveWorkspace: () => Promise.reject(new Error('Unexpected reload')) } as any);
    const facilityCommand = (persist: () => Promise<IdbAnalysisItem>) => boundary.execute({
      entityKind: 'facilityAnalysis', changeKind: 'update', label: 'Saving model',
      publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('facilityAnalyses', [value]) }
    }, persist);
    const accountCommand = (persist: () => Promise<IdbAccountAnalysisItem>) => boundary.execute({
      entityKind: 'accountAnalysis', changeKind: 'update', label: 'Saving facility selections',
      publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('accountAnalyses', [value]) }
    }, persist);
    let release!: () => void;
    const delayed = new Promise<void>(resolve => { release = resolve; });
    const first = facilityCommand(async () => {
      await delayed;
      return handler.updateFacilityAnalysisFields('facility-analysis-a', { name: 'Saved name', baselineYear: 2022 }, 'account-a');
    });
    const second = facilityCommand(() => handler.updateFacilityAnalysisGroup('facility-analysis-a', 'meter-group-a', {
      regressionConstant: 12, predictorVariables: [{ id: 'predictor-a', regressionCoefficient: 5 }]
    }, 'account-a'));
    const third = accountCommand(() => handler.updateAccountFacilityAssignments('account-analysis-a', [
      { facilityId: 'facility-a', analysisItemId: 'facility-analysis-a' }
    ], 'account-a'));
    const fourth = accountCommand(() => handler.updateAccountAnalysisFields('account-analysis-a', { name: 'Saved account name' }, 'account-a'));
    release();
    await Promise.all([first, second, third, fourth]);
    expect(store.revision()).toBe(4);
    await boundary.execute({
      entityKind: 'facilityAnalysis', changeKind: 'add', label: 'Creating and selecting an analysis',
      publication: { mode: 'patch', buildPatch: value => ({
        collections: [
          { collection: 'facilityAnalyses', upsert: [value.created] },
          { collection: 'accountAnalyses', upsert: [value.linked] }
        ]
      }) }
    }, async () => {
      const { id: _localId, ...newAnalysis } = facilityAnalysis;
      const created = await handler.addFacilityAnalysis({ ...newAnalysis, guid: 'created-analysis' }, 'account-a');
      expect(store.facilityAnalyses().some(item => item.guid === created.guid)).toBe(false);
      const linked = await handler.updateAccountFacilityAssignments('account-analysis-a', [
        { facilityId: 'facility-a', analysisItemId: created.guid }
      ], 'account-a');
      return { created, linked };
    });
    await harness.reopen();
    const savedFacility = await firstValueFrom(harness.dbService.getByIndex<IdbAnalysisItem>('analysisItems', 'guid', 'facility-analysis-a'));
    expect(savedFacility).toMatchObject({ name: 'Saved name', baselineYear: 2022 });
    expect(savedFacility.groups[0]).toMatchObject({ regressionConstant: 12, predictorVariables: [
      { id: 'predictor-a', name: 'Production', unit: 'tons', production: true, productionInAnalysis: true, regressionCoefficient: 5 }
    ] });
    expect(savedFacility.groups[1].regressionModelNotes).toBe('Keep other group');
    const savedAccount = await firstValueFrom(harness.dbService.getByIndex<IdbAccountAnalysisItem>('accountAnalysisItems', 'guid', 'account-analysis-a'));
    expect(savedAccount).toMatchObject({ name: 'Saved account name', baselineYear: 2020,
      isAnalysisVisited: false, facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: 'created-analysis' }] });
    expect(await firstValueFrom(harness.dbService.getByIndex('analysisItems', 'guid', 'facility-analysis-b'))).toEqual(accountBFixture.facilityAnalysis);
    expect(await firstValueFrom(harness.dbService.getByIndex('accountAnalysisItems', 'guid', 'account-analysis-b'))).toEqual(accountBFixture.accountAnalysis);
  });
});

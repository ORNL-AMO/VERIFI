import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { IdbFacility } from '../models/idbModels/facility';
import { dbConfig } from './_dbConfig';
import { FACILITY_DELETION_CHILD_STORES } from './facility-deletion.config';
import { IndexedDbCascadeDeleteService } from './indexed-db-cascade-delete.service';
import { VERIFI_STORE_NAMES, VerifiStoreName } from './indexed-db-schema';
import {
  IndexedDbTransactionContext,
  IndexedDbTransactionService
} from './indexed-db-transaction.service';
import {
  accountAFixture,
  accountBFixture,
  twoAccountPersistenceSeed
} from './testing/indexed-db-test-fixtures';
import { IndexedDbTestHarness, IndexedDbTestRecord } from './testing/indexed-db-test-harness';

describe('facility deletion in Chromium', () => {
  let harness: IndexedDbTestHarness;
  let cascadeDeleteService: IndexedDbCascadeDeleteService;

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('facility-deletion');
    await harness.seed(twoAccountPersistenceSeed);
    cascadeDeleteService = new IndexedDbCascadeDeleteService(
      new IndexedDbTransactionService(indexedDB, {
        [harness.databaseName]: {
          ...dbConfig,
          name: harness.databaseName
        }
      })
    );
    await seedFacilityReferences();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await harness.destroy();
  });

  it('atomically removes the facility graph and updates retained account references', async () => {
    await cascadeDeleteService.deleteFacility(
      accountAFixture.facility as unknown as IdbFacility,
      accountAFixture.account.guid as string
    );

    await expectSuccessfulDeletion();
    await harness.reopen();
    await expectSuccessfulDeletion();
  });

  it('rolls back every participant and retained reference when a request fails', async () => {
    const beforeDeletion = await readEveryStore();
    const originalDeleteAllByIndex = IndexedDbTransactionContext.prototype.deleteAllByIndex;
    vi.spyOn(IndexedDbTransactionContext.prototype, 'deleteAllByIndex')
      .mockImplementation(function (storeName, indexName, query) {
        if (storeName === 'utilityMeter') {
          return Promise.reject(new Error('Injected facility cascade failure'));
        }
        return originalDeleteAllByIndex.call(this, storeName, indexName, query);
      });

    await expect(cascadeDeleteService.deleteFacility(
      accountAFixture.facility as unknown as IdbFacility,
      accountAFixture.account.guid as string
    )).rejects.toThrow('Injected facility cascade failure');

    expect(await readEveryStore()).toEqual(beforeDeletion);
    await harness.reopen();
    expect(await readEveryStore()).toEqual(beforeDeletion);
  });

  async function seedFacilityReferences(): Promise<void> {
    await firstValueFrom(harness.dbService.update('accountReports', {
      ...accountAFixture.accountReport,
      unknownBackupField: 'retained-report-field',
      dataOverviewReportSetup: {
        includedFacilities: [
          { facilityId: accountAFixture.facility.guid, included: true, includedGroups: [] },
          { facilityId: 'facility-retained', included: true, includedGroups: [] }
        ]
      },
      betterClimateReportSetup: {
        includedFacilityGroups: [
          { facilityId: accountAFixture.facility.guid, include: true, groups: [] },
          { facilityId: 'facility-retained', include: true, groups: [] }
        ]
      }
    }));
    await firstValueFrom(harness.dbService.update('accountAnalysisItems', {
      ...accountAFixture.accountAnalysis,
      unknownBackupField: 'retained-analysis-field',
      facilityAnalysisItems: [
        { facilityId: accountAFixture.facility.guid, analysisItemId: 'analysis-a' },
        { facilityId: 'facility-retained', analysisItemId: 'analysis-retained' }
      ]
    }));
  }

  async function expectSuccessfulDeletion(): Promise<void> {
    expect(await harness.getAll('facilities')).toEqual([accountBFixture.facility]);

    for (const { storeName } of FACILITY_DELETION_CHILD_STORES) {
      expect(await harness.getAll(storeName)).toEqual(accountBFixture.seed[storeName]);
    }

    const reports = await harness.getAll('accountReports');
    expect(reports).toHaveLength(2);
    expect(reports[0]).toMatchObject({
      id: accountAFixture.accountReport.id,
      guid: accountAFixture.accountReport.guid,
      unknownBackupField: 'retained-report-field',
      dataOverviewReportSetup: {
        includedFacilities: [
          { facilityId: 'facility-retained', included: true, includedGroups: [] }
        ]
      },
      betterClimateReportSetup: {
        includedFacilityGroups: [
          { facilityId: 'facility-retained', include: true, groups: [] }
        ]
      }
    });
    expect(reports[1]).toEqual(accountBFixture.accountReport);

    const analyses = await harness.getAll('accountAnalysisItems');
    expect(analyses).toHaveLength(2);
    expect(analyses[0]).toMatchObject({
      id: accountAFixture.accountAnalysis.id,
      guid: accountAFixture.accountAnalysis.guid,
      unknownBackupField: 'retained-analysis-field',
      facilityAnalysisItems: [
        { facilityId: 'facility-retained', analysisItemId: 'analysis-retained' }
      ]
    });
    expect(analyses[1]).toEqual(accountBFixture.accountAnalysis);

    const participantStores = new Set<VerifiStoreName>([
      'facilities',
      'accountReports',
      'accountAnalysisItems',
      ...FACILITY_DELETION_CHILD_STORES.map(definition => definition.storeName)
    ]);
    for (const storeName of VERIFI_STORE_NAMES) {
      if (!participantStores.has(storeName)) {
        expect(await harness.getAll(storeName)).toEqual(twoAccountPersistenceSeed[storeName] ?? []);
      }
    }
  }

  async function readEveryStore(): Promise<Record<VerifiStoreName, Array<IndexedDbTestRecord>>> {
    const entries = await Promise.all(VERIFI_STORE_NAMES.map(async storeName => {
      return [storeName, await harness.getAll(storeName)] as const;
    }));
    return Object.fromEntries(entries) as Record<VerifiStoreName, Array<IndexedDbTestRecord>>;
  }
});

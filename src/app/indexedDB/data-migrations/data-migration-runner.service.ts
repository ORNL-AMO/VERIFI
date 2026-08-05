import { Injectable } from '@angular/core';
import { ApplicationInstanceData, getNewApplicationInstanceData } from '../../models/idbModels/applicationInstanceData';
import { IdbEntry } from '../../models/idbModels/idbEntry';
import { VerifiStoreName } from '../indexed-db-schema';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '../indexed-db-transaction.service';
import { FutureDataVersionError, validateDataVersion } from './data-migration.errors';
import { DATA_MIGRATIONS } from './data-migration.registry';
import {
  CURRENT_DATA_VERSION,
  DataMigration,
  MigrationCollectionName,
  MigrationData,
  MigrationResult
} from './data-migration.models';

const COLLECTION_STORES: Readonly<Record<MigrationCollectionName, VerifiStoreName>> = {
  accounts: 'accounts',
  facilities: 'facilities',
  meters: 'utilityMeter',
  meterData: 'utilityMeterData',
  meterGroups: 'utilityMeterGroups',
  deprecatedPredictorData: 'predictors',
  predictors: 'predictor',
  predictorData: 'predictorData',
  facilityAnalyses: 'analysisItems',
  accountAnalyses: 'accountAnalysisItems',
  accountReports: 'accountReports',
  facilityReports: 'facilityReports',
  customEmissions: 'customEmissionsItems',
  customFuels: 'customFuels',
  customGWPs: 'customGWP',
  energyUseGroups: 'facilityEnergyUseGroups',
  energyUseEquipment: 'facilityEnergyUseEquipment'
};

export const DATA_MIGRATION_STORES: ReadonlyArray<VerifiStoreName> = Object.values(COLLECTION_STORES);

@Injectable({ providedIn: 'root' })
export class DataMigrationRunnerService {
  private activeRun?: Promise<void>;

  constructor(private transactionService: IndexedDbTransactionService) { }

  runMigrations(): Promise<void> {
    if (this.activeRun) { return this.activeRun; }
    const active = this.runRequiredMigrations().finally(() => {
      if (this.activeRun === active) { this.activeRun = undefined; }
    });
    this.activeRun = active;
    return this.activeRun;
  }

  private async runRequiredMigrations(): Promise<void> {
    const metadata = await this.readMetadata();
    if (metadata?.dataVersion !== undefined) {
      const version = validateDataVersion(metadata.dataVersion);
      if (version > CURRENT_DATA_VERSION) {
        throw new FutureDataVersionError(version, CURRENT_DATA_VERSION);
      }
      if (version === CURRENT_DATA_VERSION) { return; }
    }

    let version = metadata?.dataVersion === undefined ? 0 : validateDataVersion(metadata.dataVersion);
    while (version < CURRENT_DATA_VERSION) {
      const migration = DATA_MIGRATIONS.find(item => item.fromVersion === version);
      if (!migration) { throw new Error(`No data migration exists for version ${version}.`); }
      await this.runMigrationStep(migration);
      version = migration.toVersion;
    }
  }

  private readMetadata(): Promise<ApplicationInstanceData | undefined> {
    return this.transactionService.runTransaction(['application'], 'readonly', async transaction => {
      const records = await transaction.getAll<ApplicationInstanceData>('application');
      return records.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))[0];
    });
  }

  private runMigrationStep(migration: DataMigration): Promise<void> {
    const stores = [...new Set<VerifiStoreName>(['application', ...DATA_MIGRATION_STORES])];
    return this.transactionService.runTransaction(stores, 'readwrite', async transaction => {
      const metadataRecords = await transaction.getAll<ApplicationInstanceData>('application');
      let metadata = metadataRecords.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))[0];
      const storedVersion = metadata?.dataVersion === undefined ? 0 : validateDataVersion(metadata.dataVersion);
      if (storedVersion !== migration.fromVersion) {
        throw new Error(`Expected local data version ${migration.fromVersion} but found ${storedVersion}.`);
      }

      const original = await readMigrationData(transaction);
      const hasDomainData = Object.values(original).some(records => records.length > 0);
      const result = hasDomainData
        ? migration.migrate(original)
        : { data: original, changedCollections: [] } as MigrationResult;
      await reconcileMigrationResult(transaction, original, result);

      const now = new Date();
      if (!metadata) {
        metadata = { ...getNewApplicationInstanceData(), dataVersion: migration.toVersion, createdDate: now, modifiedDate: now };
        await transaction.add('application', metadata);
      } else {
        metadata = { ...metadata, dataVersion: migration.toVersion, modifiedDate: now };
        await transaction.put('application', metadata);
      }
    });
  }
}

export async function readMigrationData(transaction: IndexedDbTransactionContext): Promise<MigrationData> {
  const entries = await Promise.all(
    (Object.entries(COLLECTION_STORES) as Array<[MigrationCollectionName, VerifiStoreName]>)
      .map(async ([collection, store]) => [collection, await transaction.getAll(store)] as const)
  );
  return Object.fromEntries(entries) as unknown as MigrationData;
}

async function reconcileMigrationResult(
  transaction: IndexedDbTransactionContext,
  original: MigrationData,
  result: MigrationResult
): Promise<void> {
  for (const collection of new Set(result.changedCollections)) {
    const store = COLLECTION_STORES[collection];
    const before = original[collection] as Array<IdbEntry>;
    const after = result.data[collection] as Array<IdbEntry>;
    const retainedIds = new Set(after.flatMap(record => record.id === undefined ? [] : [record.id]));
    for (const record of before) {
      if (record.id !== undefined && !retainedIds.has(record.id)) {
        await transaction.deleteByKey(store, record.id);
      }
    }
    for (const record of after) {
      if (record.id === undefined) {
        await transaction.add(store, record);
      } else {
        await transaction.put(store, record);
      }
    }
  }
}

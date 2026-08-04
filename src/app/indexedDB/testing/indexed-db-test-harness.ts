import { TestBed } from '@angular/core/testing';
import { NgxIndexedDBService, provideIndexedDb } from 'ngx-indexed-db';
import { firstValueFrom } from 'rxjs';
import { dbConfig } from '../_dbConfig';
import { REQUIRED_INDEXES, VERIFI_DB_VERSION, VerifiStoreName } from '../indexed-db-schema';

export interface IndexedDbTestRecord {
  id?: number;
  [key: string]: unknown;
}

export type IndexedDbTestSeed = Record<string, Array<IndexedDbTestRecord>>;

export interface IndexedDbTestIndexMetadata {
  keyPath: string | string[];
  unique: boolean;
}

export type IndexedDbTestSchema = Record<string, Record<string, IndexedDbTestIndexMetadata>>;

export class IndexedDbTestHarness {
  private constructor(
    readonly databaseName: string,
    private _dbService: NgxIndexedDBService
  ) { }

  get dbService(): NgxIndexedDBService {
    return this._dbService;
  }

  static async create(testName: string): Promise<IndexedDbTestHarness> {
    const databaseName = `verifi-test-${testName}-${crypto.randomUUID()}`;
    const dbService = await IndexedDbTestHarness.initialize(databaseName);
    return new IndexedDbTestHarness(databaseName, dbService);
  }

  static async createUpgradedFromVersion19(
    testName: string,
    seedData: IndexedDbTestSeed
  ): Promise<IndexedDbTestHarness> {
    const databaseName = `verifi-test-${testName}-${crypto.randomUUID()}`;
    await IndexedDbTestHarness.createVersion19Database(databaseName, seedData);
    const dbService = await IndexedDbTestHarness.initialize(databaseName);
    return new IndexedDbTestHarness(databaseName, dbService);
  }

  async seed(seedData: IndexedDbTestSeed): Promise<void> {
    for (const [storeName, records] of Object.entries(seedData)) {
      for (const record of records) {
        await firstValueFrom(this._dbService.add(storeName, { ...record }));
      }
    }
  }

  async getAll<T extends IndexedDbTestRecord>(storeName: string): Promise<Array<T>> {
    return firstValueFrom(this._dbService.getAll<T>(storeName));
  }

  async reopen(): Promise<NgxIndexedDBService> {
    TestBed.resetTestingModule();
    this._dbService = await IndexedDbTestHarness.initialize(this.databaseName);
    return this._dbService;
  }

  async getSchema(): Promise<IndexedDbTestSchema> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const storeNames = Array.from(database.objectStoreNames);
        const transaction = database.transaction(storeNames, 'readonly');
        const schema: IndexedDbTestSchema = {};

        for (const storeName of storeNames) {
          const objectStore = transaction.objectStore(storeName);
          schema[storeName] = {};
          for (const indexName of Array.from(objectStore.indexNames)) {
            const storeIndex = objectStore.index(indexName);
            schema[storeName][indexName] = {
              keyPath: storeIndex.keyPath,
              unique: storeIndex.unique
            };
          }
        }

        transaction.oncomplete = () => {
          database.close();
          resolve(schema);
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error);
        };
      };
    });
  }

  async destroy(): Promise<void> {
    await firstValueFrom(this._dbService.deleteDatabase());
    TestBed.resetTestingModule();
  }

  private static async initialize(databaseName: string): Promise<NgxIndexedDBService> {
    TestBed.configureTestingModule({
      providers: [provideIndexedDb({
        ...dbConfig,
        name: databaseName
      })]
    });

    const dbService = TestBed.inject(NgxIndexedDBService);
    await firstValueFrom(dbService.getDatabaseVersion());
    return dbService;
  }

  private static async createVersion19Database(
    databaseName: string,
    seedData: IndexedDbTestSeed
  ): Promise<void> {
    TestBed.resetTestingModule();
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, VERIFI_DB_VERSION - 1);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const newDatabase = request.result;
        for (const storeMeta of dbConfig.objectStoresMeta) {
          const objectStore = newDatabase.createObjectStore(storeMeta.store, storeMeta.storeConfig);
          const newVersionIndexNames = new Set(
            REQUIRED_INDEXES[storeMeta.store as VerifiStoreName]
              .filter(indexDefinition => indexDefinition.name === 'guid'
                || (storeMeta.store === 'electronBackups' && indexDefinition.name === 'accountId')
                || (storeMeta.store === 'facilityEnergyUseEquipment'
                  && indexDefinition.name === 'energyUseGroupId'))
              .map(indexDefinition => indexDefinition.name)
          );

          for (const storeSchema of storeMeta.storeSchema) {
            if (newVersionIndexNames.has(storeSchema.name)) {
              continue;
            }
            const keyPath = storeMeta.store === 'utilityMeter' && storeSchema.name === 'location'
              ? 'notes'
              : storeSchema.keypath;
            objectStore.createIndex(storeSchema.name, keyPath, storeSchema.options);
          }
        }
      };
      request.onsuccess = () => resolve(request.result);
    });

    try {
      const storeNames = Object.keys(seedData).filter(storeName => seedData[storeName].length > 0);
      if (storeNames.length === 0) {
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(storeNames, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
        for (const [storeName, records] of Object.entries(seedData)) {
          if (records.length === 0) {
            continue;
          }
          const objectStore = transaction.objectStore(storeName);
          for (const record of records) {
            objectStore.add({ ...record });
          }
        }
      });
    } finally {
      database.close();
    }
  }
}

export function mergeIndexedDbSeeds(...seeds: Array<IndexedDbTestSeed>): IndexedDbTestSeed {
  return seeds.reduce((mergedSeed, seed) => {
    for (const [storeName, records] of Object.entries(seed)) {
      mergedSeed[storeName] = [
        ...(mergedSeed[storeName] ?? []),
        ...records.map(record => ({ ...record }))
      ];
    }
    return mergedSeed;
  }, {} as IndexedDbTestSeed);
}

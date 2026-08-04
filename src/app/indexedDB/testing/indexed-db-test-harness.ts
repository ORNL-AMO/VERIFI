import { TestBed } from '@angular/core/testing';
import { NgxIndexedDBService, provideIndexedDb } from 'ngx-indexed-db';
import { firstValueFrom } from 'rxjs';
import { dbConfig } from '../_dbConfig';

export interface IndexedDbTestRecord {
  id?: number;
  [key: string]: unknown;
}

export type IndexedDbTestSeed = Record<string, Array<IndexedDbTestRecord>>;

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

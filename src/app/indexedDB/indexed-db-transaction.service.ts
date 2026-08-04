import { Inject, Injectable } from '@angular/core';
import { CONFIG_TOKEN, DBConfig, INDEXED_DB } from 'ngx-indexed-db';
import { VerifiRelationshipIndexName, VerifiStoreName } from './indexed-db-schema';

export type VerifiTransactionMode = 'readonly' | 'readwrite';

export class IndexedDbTransactionContext {

  constructor(
    private transaction: IDBTransaction,
    private participatingStores: ReadonlySet<VerifiStoreName>
  ) { }

  get<T>(storeName: VerifiStoreName, key: IDBValidKey): Promise<T | undefined> {
    return this.request<T | undefined>(this.objectStore(storeName).get(key));
  }

  getAll<T>(storeName: VerifiStoreName): Promise<Array<T>> {
    return this.request<Array<T>>(this.objectStore(storeName).getAll());
  }

  getAllByIndex<T>(
    storeName: VerifiStoreName,
    indexName: VerifiRelationshipIndexName,
    query?: IDBValidKey | IDBKeyRange | null
  ): Promise<Array<T>> {
    const storeIndex = this.objectStore(storeName).index(indexName);
    return this.request<Array<T>>(storeIndex.getAll(query));
  }

  add<T>(storeName: VerifiStoreName, value: T): Promise<IDBValidKey> {
    return this.request<IDBValidKey>(this.objectStore(storeName).add(value));
  }

  put<T>(storeName: VerifiStoreName, value: T): Promise<IDBValidKey> {
    return this.request<IDBValidKey>(this.objectStore(storeName).put(value));
  }

  deleteByKey(storeName: VerifiStoreName, key: IDBValidKey | IDBKeyRange): Promise<void> {
    return this.request<void>(this.objectStore(storeName).delete(key));
  }

  deleteAllByIndex(
    storeName: VerifiStoreName,
    indexName: VerifiRelationshipIndexName,
    query?: IDBValidKey | IDBKeyRange | null
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const cursorRequest = this.objectStore(storeName).index(indexName).openCursor(query);
      cursorRequest.onerror = () => reject(cursorRequest.error);
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          resolve();
          return;
        }
        cursor.delete();
        cursor.continue();
      };
    });
  }

  private objectStore(storeName: VerifiStoreName): IDBObjectStore {
    if (!this.participatingStores.has(storeName)) {
      throw new Error(`IndexedDB store ${storeName} is not part of the active transaction.`);
    }
    return this.transaction.objectStore(storeName);
  }

  private request<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class IndexedDbTransactionService {

  constructor(
    @Inject(INDEXED_DB) private indexedDb: IDBFactory,
    @Inject(CONFIG_TOKEN) private databaseConfigs: Record<string, DBConfig>
  ) { }

  runTransaction<T>(
    stores: ReadonlyArray<VerifiStoreName>,
    mode: VerifiTransactionMode,
    operation: (context: IndexedDbTransactionContext) => T | Promise<T>
  ): Promise<T> {
    const participatingStores = this.validateStores(stores);
    const databaseConfig = this.getDatabaseConfig();

    return new Promise<T>((resolve, reject) => {
      const openRequest = this.indexedDb.open(databaseConfig.name, databaseConfig.version);
      let database: IDBDatabase | undefined;
      let operationComplete = false;
      let operationResult: T;
      let operationError: unknown;
      let transactionError: unknown;
      let settled = false;

      const closeAndResolve = () => {
        database?.close();
        if (!settled) {
          settled = true;
          resolve(operationResult);
        }
      };
      const closeAndReject = (error: unknown) => {
        database?.close();
        if (!settled) {
          settled = true;
          reject(error);
        }
      };

      openRequest.onerror = () => closeAndReject(openRequest.error);
      openRequest.onblocked = () => closeAndReject(
        new Error(`Opening IndexedDB database ${databaseConfig.name} was blocked.`)
      );
      openRequest.onsuccess = () => {
        database = openRequest.result;
        database.onversionchange = () => database?.close();

        let transaction: IDBTransaction;
        try {
          transaction = database.transaction([...participatingStores], mode);
        } catch (error) {
          closeAndReject(error);
          return;
        }

        transaction.onerror = () => {
          transactionError = transaction.error;
        };
        transaction.onabort = () => {
          closeAndReject(operationError ?? transactionError ?? transaction.error
            ?? new Error('IndexedDB transaction aborted.'));
        };
        transaction.oncomplete = () => {
          if (!operationComplete) {
            closeAndReject(operationError
              ?? new Error('IndexedDB transaction completed before its operation finished.'));
            return;
          }
          closeAndResolve();
        };

        const context = new IndexedDbTransactionContext(transaction, participatingStores);
        Promise.resolve()
          .then(() => operation(context))
          .then(result => {
            operationResult = result;
            operationComplete = true;
          })
          .catch(error => {
            operationError = error;
            try {
              transaction.abort();
            } catch {
              closeAndReject(error);
            }
          });
      };
    });
  }

  private validateStores(stores: ReadonlyArray<VerifiStoreName>): ReadonlySet<VerifiStoreName> {
    if (stores.length === 0) {
      throw new Error('An IndexedDB transaction requires at least one participating store.');
    }

    const databaseConfig = this.getDatabaseConfig();
    const configuredStores = new Set(databaseConfig.objectStoresMeta.map(storeMeta => storeMeta.store));
    const participatingStores = new Set(stores);
    for (const storeName of participatingStores) {
      if (!configuredStores.has(storeName)) {
        throw new Error(`IndexedDB store ${storeName} is not configured.`);
      }
    }
    return participatingStores;
  }

  private getDatabaseConfig(): DBConfig {
    const configs = Object.values(this.databaseConfigs);
    const databaseConfig = configs.find(config => config.isDefault) ?? configs[0];
    if (!databaseConfig) {
      throw new Error('No IndexedDB database configuration is available.');
    }
    return databaseConfig;
  }
}

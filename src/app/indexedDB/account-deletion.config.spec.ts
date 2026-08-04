import { dbConfig } from './_dbConfig';
import {
  ACCOUNT_DELETION_STORES,
  ACCOUNT_ROOT_STORE,
  GLOBAL_PERSISTENCE_STORES
} from './account-deletion.config';

describe('account deletion store classification', () => {
  it('classifies every configured store exactly once', () => {
    const configuredStores = dbConfig.objectStoresMeta
      .map(storeMetadata => storeMetadata.store)
      .sort();
    const classifiedStores = [
      ...ACCOUNT_DELETION_STORES.map(storeDefinition => storeDefinition.storeName),
      ACCOUNT_ROOT_STORE,
      ...GLOBAL_PERSISTENCE_STORES
    ];

    expect(new Set(classifiedStores).size).toBe(classifiedStores.length);
    expect(classifiedStores.sort()).toEqual(configuredStores);
  });
});

import { dbConfig } from './_dbConfig';
import {
  REQUIRED_INDEXES,
  VERIFI_STORE_NAMES,
  VerifiStoreName
} from './indexed-db-schema';

describe('IndexedDB schema metadata', () => {
  it('defines every configured store exactly once', () => {
    const configuredStoreNames = dbConfig.objectStoresMeta.map(storeMeta => storeMeta.store);

    expect(new Set(VERIFI_STORE_NAMES).size).toBe(VERIFI_STORE_NAMES.length);
    expect([...VERIFI_STORE_NAMES].sort()).toEqual([...configuredStoreNames].sort());
  });

  it('defines non-unique required indexes without duplicate names', () => {
    for (const storeName of VERIFI_STORE_NAMES) {
      const requiredIndexes = REQUIRED_INDEXES[storeName];
      const requiredNames = requiredIndexes.map(indexDefinition => indexDefinition.name);

      expect(new Set(requiredNames).size).toBe(requiredNames.length);
      expect(requiredIndexes.every(indexDefinition => indexDefinition.options.unique === false)).toBe(true);

      const configuredStore = dbConfig.objectStoresMeta.find(storeMeta => storeMeta.store === storeName);
      for (const requiredIndex of requiredIndexes) {
        expect(configuredStore?.storeSchema).toContainEqual(requiredIndex);
      }
    }
  });

  it('configures the utility meter location index against location', () => {
    const utilityMeterStore = dbConfig.objectStoresMeta.find(storeMeta => {
      return storeMeta.store === ('utilityMeter' as VerifiStoreName);
    });

    expect(utilityMeterStore?.storeSchema.find(indexDefinition => {
      return indexDefinition.name === 'location';
    })?.keypath).toBe('location');
  });
});

import {
  DataMigration,
  MigrationCollectionName,
  MigrationData
} from './data-migration.models';

export const VERSION_ONE_TO_TWO_MIGRATION: DataMigration = {
  fromVersion: 1,
  toVersion: 2,
  description: 'Default account company scale for single-facility prototype support.',
  affectedStores: ['accounts'],
  migrate(input: MigrationData) {
    const data = structuredClone(input);
    const changed = new Set<MigrationCollectionName>();

    data.accounts.forEach(account => {
      if (account.isSingleFacilityCompany === undefined) {
        account.isSingleFacilityCompany = false;
        changed.add('accounts');
      }
    });

    return { data, changedCollections: [...changed] };
  }
};

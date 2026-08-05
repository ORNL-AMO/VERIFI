import {
  CURRENT_DATA_VERSION,
  DataMigration,
  MigrationData
} from './data-migration.models';

const versionZeroToOne: DataMigration = {
  fromVersion: 0,
  toVersion: 1,
  description: 'Normalize legacy VERIFI persisted records.',
  affectedStores: [],
  migrate: (data: MigrationData) => ({ data, changedCollections: [] })
};

export const DATA_MIGRATIONS: ReadonlyArray<DataMigration> = validateMigrationRegistry([
  versionZeroToOne
]);

export function validateMigrationRegistry(
  migrations: ReadonlyArray<DataMigration>,
  currentVersion: number = CURRENT_DATA_VERSION
): ReadonlyArray<DataMigration> {
  if (!Number.isInteger(currentVersion) || currentVersion < 0) {
    throw new Error('The current data version must be a non-negative integer.');
  }
  if (currentVersion === 0) {
    if (migrations.length !== 0) {
      throw new Error('A version-zero registry must be empty.');
    }
    return Object.freeze([...migrations]);
  }
  if (migrations.length !== currentVersion) {
    throw new Error(`Expected ${currentVersion} data migrations but found ${migrations.length}.`);
  }

  const ordered = [...migrations].sort((a, b) => a.fromVersion - b.fromVersion);
  ordered.forEach((migration, index) => {
    if (migration.fromVersion !== index || migration.toVersion !== index + 1) {
      throw new Error(`Data migration versions must be contiguous; expected ${index} to ${index + 1}.`);
    }
  });
  return Object.freeze(ordered);
}

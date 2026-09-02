import { CURRENT_DATA_VERSION, DataMigration } from './data-migration.models';
import { VERSION_ZERO_TO_ONE_MIGRATION } from './version-zero-to-one.migration';

export const DATA_MIGRATIONS: ReadonlyArray<DataMigration> = validateMigrationRegistry([
  VERSION_ZERO_TO_ONE_MIGRATION
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

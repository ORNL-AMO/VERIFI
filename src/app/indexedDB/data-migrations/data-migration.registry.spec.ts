import { emptyMigrationData } from './data-migration.models';
import { DATA_MIGRATIONS, validateMigrationRegistry } from './data-migration.registry';
import { getNewApplicationInstanceData } from '../../models/idbModels/applicationInstanceData';

describe('data migration registry', () => {
  it('contains one contiguous migration ending at the current version', () => {
    expect(DATA_MIGRATIONS.map(migration => [migration.fromVersion, migration.toVersion]))
      .toEqual([[0, 1]]);
  });

  it('starts new application metadata at the current data version', () => {
    expect(getNewApplicationInstanceData().dataVersion).toBe(1);
  });

  it('rejects gaps, duplicates, and multi-version steps', () => {
    const migration = (fromVersion: number, toVersion: number) => ({
      fromVersion, toVersion, description: 'test', affectedStores: [],
      migrate: () => ({ data: emptyMigrationData(), changedCollections: [] })
    });
    expect(() => validateMigrationRegistry([migration(1, 2)], 1)).toThrow('contiguous');
    expect(() => validateMigrationRegistry([migration(0, 2)], 1)).toThrow('contiguous');
    expect(() => validateMigrationRegistry([migration(0, 1), migration(0, 1)], 2)).toThrow('contiguous');
  });
});

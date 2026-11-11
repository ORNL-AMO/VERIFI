import { DATA_MIGRATIONS } from './data-migration.registry';
import { CURRENT_DATA_VERSION, emptyMigrationData } from './data-migration.models';

describe('saved definitions in historical data migrations', () => {
  it('preserves opaque definitions while older source data migrates without increasing the data version', () => {
    const original = emptyMigrationData();
    original.savedVisualizations = [{
      id: 42, guid: 'opaque-definition', accountId: 'account', recordVersion: 77, revision: 3,
      createdDate: '2026-11-11T00:00:00Z', modifiedDate: '2026-11-11T00:00:00Z',
      definition: { version: 999, unknownSettings: { values: [0, null, 'retain'] } }
    }];
    let data = original;
    for (const migration of DATA_MIGRATIONS) data = migration.migrate(data).data;
    expect(data.savedVisualizations).toEqual(original.savedVisualizations);
    expect(original.savedVisualizations[0].definition).toEqual({ version: 999, unknownSettings: { values: [0, null, 'retain'] } });
    expect(CURRENT_DATA_VERSION).toBe(2);
  });
});

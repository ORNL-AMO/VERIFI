import { emptyMigrationData } from './data-migration.models';
import { VERSION_ONE_TO_TWO_MIGRATION } from './version-one-to-two.migration';

describe('version one to two migration', () => {
  it('defaults missing single-facility account intent without mutating input', () => {
    const input = emptyMigrationData();
    input.accounts.push({ guid: 'account-a', name: 'Legacy', unknown: 'keep' } as any);

    const result = VERSION_ONE_TO_TWO_MIGRATION.migrate(input);

    expect(input.accounts[0].isSingleFacilityCompany).toBeUndefined();
    expect((result.data.accounts[0] as any).unknown).toBe('keep');
    expect(result.data.accounts[0].isSingleFacilityCompany).toBe(false);
    expect(result.changedCollections).toEqual(['accounts']);
  });

  it('preserves explicit true and false values', () => {
    const input = emptyMigrationData();
    input.accounts.push(
      { guid: 'single', name: 'Single', isSingleFacilityCompany: true } as any,
      { guid: 'multi', name: 'Multi', isSingleFacilityCompany: false } as any
    );

    const result = VERSION_ONE_TO_TWO_MIGRATION.migrate(input);

    expect(result.data.accounts.map(account => account.isSingleFacilityCompany)).toEqual([true, false]);
    expect(result.changedCollections).toEqual([]);
  });

  it('is idempotent after defaulting old account records', () => {
    const input = emptyMigrationData();
    input.accounts.push({ guid: 'account-a', name: 'Legacy' } as any);

    const first = VERSION_ONE_TO_TWO_MIGRATION.migrate(input);
    const second = VERSION_ONE_TO_TWO_MIGRATION.migrate(first.data);

    expect(second.changedCollections).toEqual([]);
    expect(second.data).toEqual(first.data);
  });
});

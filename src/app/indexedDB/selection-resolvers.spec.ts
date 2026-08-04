import { IdbAccount } from '../models/idbModels/account';
import { IdbFacility } from '../models/idbModels/facility';
import { resolveInitialAccount, resolveInitialFacility } from './selection-resolvers';

describe('persistence selection resolvers', () => {
  const accountA = {
    id: 1,
    guid: 'account-a',
    name: 'Account A'
  } as IdbAccount;
  const accountB = {
    id: 2,
    guid: 'account-b',
    name: 'Account B'
  } as IdbAccount;
  const deletedAccount = {
    id: 3,
    guid: 'account-deleted',
    name: 'Deleted Account',
    deleteAccount: true
  } as IdbAccount;

  describe('resolveInitialAccount', () => {
    it('restores the usable account matching a numeric stored ID', () => {
      expect(resolveInitialAccount([accountA, accountB], 2)).toBe(accountB);
    });

    it('normalizes a numeric string stored by an older client', () => {
      expect(resolveInitialAccount([accountA, accountB], '2')).toBe(accountB);
    });

    it.each([
      ['a stale ID', 99],
      ['a missing ID', undefined],
      ['a null ID', null],
      ['a malformed ID', 'not-an-id']
    ])('falls back to the first usable account for %s', (_description, storedId) => {
      expect(resolveInitialAccount([accountA, accountB], storedId)).toBe(accountA);
    });

    it('does not restore an account marked for deletion', () => {
      expect(resolveInitialAccount([deletedAccount, accountB], deletedAccount.id)).toBe(accountB);
    });

    it('returns no account when every account is marked for deletion', () => {
      expect(resolveInitialAccount([deletedAccount], deletedAccount.id)).toBeUndefined();
    });

    it('returns no account for an empty database', () => {
      expect(resolveInitialAccount([], 1)).toBeUndefined();
    });
  });

  describe('resolveInitialFacility', () => {
    const facilityA = {
      id: 101,
      guid: 'facility-a',
      accountId: accountA.guid,
      name: 'Facility A'
    } as IdbFacility;
    const facilityB = {
      id: 201,
      guid: 'facility-b',
      accountId: accountB.guid,
      name: 'Facility B'
    } as IdbFacility;

    it('restores a facility belonging to the active account', () => {
      expect(resolveInitialFacility(accountA, [facilityA, facilityB], facilityA.id)).toBe(facilityA);
    });

    it('does not restore a stored facility belonging to another account', () => {
      expect(resolveInitialFacility(accountB, [facilityA, facilityB], facilityA.id)).toBeUndefined();
    });

    it.each([undefined, null, 'not-an-id', 999])(
      'returns no facility for an invalid or missing stored value (%s)',
      storedId => {
        expect(resolveInitialFacility(accountA, [facilityA], storedId)).toBeUndefined();
      }
    );
  });
});

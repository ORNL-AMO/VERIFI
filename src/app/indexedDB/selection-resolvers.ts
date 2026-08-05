import { IdbAccount } from '../models/idbModels/account';
import { IdbFacility } from '../models/idbModels/facility';

export function resolveInitialAccount(
  accounts: Array<IdbAccount>,
  storedAccountId: unknown
): IdbAccount | undefined {
  const usableAccounts = accounts.filter(account => !account.deleteAccount);
  const normalizedStoredId = normalizeStoredId(storedAccountId);
  const storedAccount = normalizedStoredId === undefined
    ? undefined
    : usableAccounts.find(account => account.id === normalizedStoredId);

  return storedAccount ?? usableAccounts[0];
}

export function resolveInitialFacility(
  activeAccount: IdbAccount,
  facilities: Array<IdbFacility>,
  storedFacilityId: unknown
): IdbFacility | undefined {
  const normalizedStoredId = normalizeStoredId(storedFacilityId);
  if (normalizedStoredId === undefined) {
    return undefined;
  }

  return facilities.find(facility => {
    return facility.id === normalizedStoredId
      && facility.accountId === activeAccount.guid;
  });
}

function normalizeStoredId(storedId: unknown): number | undefined {
  const normalizedId = typeof storedId === 'number'
    ? storedId
    : typeof storedId === 'string' && storedId.trim() !== ''
      ? Number(storedId)
      : Number.NaN;

  return Number.isSafeInteger(normalizedId) && normalizedId >= 0
    ? normalizedId
    : undefined;
}

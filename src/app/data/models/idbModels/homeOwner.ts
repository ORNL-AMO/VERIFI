import { getNewIdbEntry, IdbEntry } from './idbEntry';
import { HOME_FORMAT_VERSION, HomeOwner, HomeOwnerState } from '@domain/home/home-dashboard';
import { IdbHomeRecord } from './homeRecord';

export interface IdbHomeOwner extends IdbHomeRecord {
  state: unknown;
}
export function getNewIdbHomeOwner(accountGuid: string, owner: HomeOwner, state: HomeOwnerState,
  entry: IdbEntry = getNewIdbEntry()): IdbHomeOwner {
  return { ...entry, accountId: accountGuid, ...(owner.kind === 'facility' ? { facilityId: owner.guid } : {}),
    recordVersion: HOME_FORMAT_VERSION, revision: 1, state: structuredClone(state) };
}

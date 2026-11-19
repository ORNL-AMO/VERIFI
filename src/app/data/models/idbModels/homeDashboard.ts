import { getNewIdbEntry, IdbEntry } from './idbEntry';
import { HOME_FORMAT_VERSION, HomeDashboardDefinition, HomeOwner, HomeTemplateProvenance } from '@domain/home/home-dashboard';
import { IdbHomeRecord } from './homeRecord';

export interface IdbHomeDashboard extends IdbHomeRecord {
  definition: unknown;
  template?: HomeTemplateProvenance;
}
export function getNewIdbHomeDashboard(accountGuid: string, owner: HomeOwner, definition: HomeDashboardDefinition,
  entry: IdbEntry = getNewIdbEntry()): IdbHomeDashboard {
  return { ...entry, accountId: accountGuid, ...(owner.kind === 'facility' ? { facilityId: owner.guid } : {}),
    recordVersion: HOME_FORMAT_VERSION, revision: 1, definition: structuredClone(definition) };
}

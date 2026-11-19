import { getNewIdbEntry, IdbEntry } from './idbEntry';
import { HOME_FORMAT_VERSION, HomeDashboardDefinition, HomeOwner, HomeOwnerState, HomeTemplateProvenance } from '@domain/home/home-dashboard';

export interface HomeReferenceIssue {
  readonly path: string;
  readonly kind: 'visualization' | 'facility' | 'analysis' | 'meter' | 'predictor' | 'equipment';
  readonly guid: string;
  readonly reason: 'not-transferred' | 'missing' | 'foreign';
}
export interface HomePreservation {
  readonly locked?: boolean;
  readonly references: readonly HomeReferenceIssue[];
  readonly transfers: readonly { readonly accountId: string; readonly targetAccountId: string;
    readonly maps: Readonly<Record<string, Readonly<Record<string, string>>>> }[];
}
export interface IdbHomeRecord extends IdbEntry {
  accountId: string;
  /** Explicit facility owner; absence denotes account ownership. Never inferred from chart scope. */
  facilityId?: string;
  recordVersion: number;
  revision: number;
  preservation?: HomePreservation;
}
export interface IdbHomeDashboard extends IdbHomeRecord {
  definition: unknown;
  template?: HomeTemplateProvenance;
}
export interface IdbHomeOwner extends IdbHomeRecord {
  state: unknown;
}
export function homeRecordOwner(record: Readonly<IdbHomeRecord>): HomeOwner {
  return record.facilityId === undefined ? { kind: 'account', guid: record.accountId } : { kind: 'facility', guid: record.facilityId };
}
export function getNewIdbHomeDashboard(accountGuid: string, owner: HomeOwner, definition: HomeDashboardDefinition,
  entry: IdbEntry = getNewIdbEntry()): IdbHomeDashboard {
  return { ...entry, accountId: accountGuid, ...(owner.kind === 'facility' ? { facilityId: owner.guid } : {}),
    recordVersion: HOME_FORMAT_VERSION, revision: 1, definition: structuredClone(definition) };
}
export function getNewIdbHomeOwner(accountGuid: string, owner: HomeOwner, state: HomeOwnerState,
  entry: IdbEntry = getNewIdbEntry()): IdbHomeOwner {
  return { ...entry, accountId: accountGuid, ...(owner.kind === 'facility' ? { facilityId: owner.guid } : {}),
    recordVersion: HOME_FORMAT_VERSION, revision: 1, state: structuredClone(state) };
}

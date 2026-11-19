import type { IdbEntry } from './idbEntry';
import type { HomeOwner } from '@domain/home/home-dashboard';

export interface HomeReferenceIssue {
  readonly path: string;
  readonly kind: 'dashboard' | 'visualization' | 'facility' | 'analysis' | 'meter' | 'predictor' | 'equipment' | 'unknown';
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
export function homeRecordOwner(record: Readonly<IdbHomeRecord>): HomeOwner {
  return record.facilityId === undefined ? { kind: 'account', guid: record.accountId } : { kind: 'facility', guid: record.facilityId };
}

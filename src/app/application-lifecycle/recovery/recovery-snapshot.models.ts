import { VerifiStoreName } from '@data/indexedDB/indexed-db-schema';

export const RECOVERY_SNAPSHOT_FORMAT = 'VERIFI IndexedDB Recovery';
export const RECOVERY_SNAPSHOT_VERSION = 1;

export interface RecoverySnapshotError {
  step: 'migrations';
  message: string;
  causeName?: string;
  causeMessage?: string;
  causeStack?: string;
}

export interface RecoverySnapshotV1 {
  format: typeof RECOVERY_SNAPSHOT_FORMAT;
  formatVersion: typeof RECOVERY_SNAPSHOT_VERSION;
  snapshotId: string;
  createdAt: string;
  verifiVersion: string;
  database: {
    name: string;
    schemaVersion: number;
    storedDataVersion?: unknown;
  };
  error: RecoverySnapshotError;
  recordCounts: Partial<Record<VerifiStoreName, number>>;
  stores: Partial<Record<VerifiStoreName, unknown[]>>;
}

export type RecoveryExportResult =
  | { status: 'cancelled' }
  | {
    status: 'saved';
    snapshot: RecoverySnapshotV1;
    fileName: string;
    filePath?: string;
  };

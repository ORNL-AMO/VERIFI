import { Injectable } from '@angular/core';
import { AppStartupError } from '@app/application-lifecycle/application-lifecycle.models';
import { BrowserBackupDownloadService } from '@data/backup/browser-backup-download.service';
import { DATA_MIGRATION_STORES } from '@data/indexedDB/data-migrations/data-migration-runner.service';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { VERIFI_DB_NAME, VERIFI_DB_VERSION, VerifiStoreName } from '@data/indexedDB/indexed-db-schema';
import { ElectronBackupFileGateway } from '@platform/electron/electron-backup-file.gateway';
import { environment } from 'src/environments/environment';
import {
  RECOVERY_SNAPSHOT_FORMAT,
  RECOVERY_SNAPSHOT_VERSION,
  RecoveryExportResult,
  RecoverySnapshotError,
  RecoverySnapshotV1
} from './recovery-snapshot.models';

export const RECOVERY_STORE_NAMES: ReadonlyArray<VerifiStoreName> = [
  ...new Set<VerifiStoreName>(['application', ...DATA_MIGRATION_STORES])
];

@Injectable({ providedIn: 'root' })
export class MigrationRecoveryService {
  constructor(
    private readonly transactions: IndexedDbTransactionService,
    private readonly browserDownloads: BrowserBackupDownloadService,
    private readonly electronFiles: ElectronBackupFileGateway
  ) { }

  async exportSnapshot(error: AppStartupError): Promise<RecoveryExportResult> {
    if (error.step !== 'migrations') {
      throw new Error('Recovery exports are available only for migration startup failures.');
    }
    const snapshot = await this.createSnapshot(error);
    const fileName = recoveryFileName(snapshot.createdAt);

    if (this.electronFiles.isAvailable) {
      const filePath = await this.electronFiles.chooseSavePath(fileName);
      if (!filePath) { return { status: 'cancelled' }; }
      await this.electronFiles.writeJson(filePath, snapshot);
      return { status: 'saved', snapshot, fileName, filePath };
    }

    const contents = JSON.stringify(snapshot, null, 2);
    this.browserDownloads.downloadBlob(new Blob([contents], { type: 'application/json' }), fileName);
    return { status: 'saved', snapshot, fileName };
  }

  async createSnapshot(error: AppStartupError): Promise<RecoverySnapshotV1> {
    const rawStores = await this.transactions.runTransaction(
      RECOVERY_STORE_NAMES,
      'readonly',
      async transaction => Object.fromEntries(await Promise.all(
        RECOVERY_STORE_NAMES.map(async storeName => [storeName, await transaction.getAll<unknown>(storeName)] as const)
      )) as Partial<Record<VerifiStoreName, unknown[]>>
    );

    const applicationRecords = rawStores.application ?? [];
    const firstApplicationRecord = [...applicationRecords]
      .sort((first, second) => numericId(first) - numericId(second))[0] as Record<string, unknown> | undefined;
    const recordCounts = Object.fromEntries(RECOVERY_STORE_NAMES.map(storeName => [
      storeName,
      rawStores[storeName]?.length ?? 0
    ])) as Partial<Record<VerifiStoreName, number>>;

    return {
      format: RECOVERY_SNAPSHOT_FORMAT,
      formatVersion: RECOVERY_SNAPSHOT_VERSION,
      snapshotId: createSnapshotId(),
      createdAt: new Date().toISOString(),
      verifiVersion: environment.version,
      database: {
        name: VERIFI_DB_NAME,
        schemaVersion: VERIFI_DB_VERSION,
        storedDataVersion: firstApplicationRecord?.dataVersion
      },
      error: normalizeStartupError(error),
      recordCounts,
      stores: rawStores
    };
  }
}

function normalizeStartupError(error: AppStartupError): RecoverySnapshotError {
  const normalized: RecoverySnapshotError = { step: 'migrations', message: error.message };
  const cause = error.cause;
  if (cause instanceof Error) {
    normalized.causeName = cause.name;
    normalized.causeMessage = cause.message;
    normalized.causeStack = cause.stack;
  } else if (cause !== undefined) {
    normalized.causeMessage = safelyStringify(cause);
  }
  return normalized;
}

function safelyStringify(value: unknown): string {
  try {
    if (typeof value === 'string') { return value; }
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function recoveryFileName(createdAt: string): string {
  return `VERIFI-recovery-${createdAt.replace(/[:.]/g, '-')}.json`;
}

function createSnapshotId(): string {
  if (globalThis.crypto?.randomUUID) { return globalThis.crypto.randomUUID(); }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function numericId(value: unknown): number {
  return isRecord(value) && typeof value.id === 'number' ? value.id : Number.MAX_SAFE_INTEGER;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

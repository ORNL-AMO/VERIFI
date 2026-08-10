import { Injectable } from '@angular/core';
import { BackupFile } from '../models/backup-file';

interface BackupGatewayExistsResult {
  ok: boolean;
  exists?: boolean;
  error?: string;
}

interface BackupGatewayReadResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

interface BackupGatewayWriteResult {
  ok: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ElectronBackupFileGateway {
  get isAvailable(): boolean {
    return Boolean(window['electronAPI']?.invoke);
  }

  async chooseSavePath(defaultPath: string): Promise<string | undefined> {
    if (!this.isAvailable) { return undefined; }
    return window['electronAPI'].invoke('backup:chooseSavePath', { defaultPath });
  }

  async exists(path: string): Promise<boolean> {
    if (!this.isAvailable || !path) { return false; }
    const result = await window['electronAPI'].invoke('backup:exists', { path }) as BackupGatewayExistsResult;
    if (!result?.ok) {
      throw new Error(result?.error ?? 'VERIFI could not check the backup file.');
    }
    return Boolean(result.exists);
  }

  async read(path: string): Promise<unknown> {
    if (!this.isAvailable || !path) {
      throw new Error('A backup file path is required.');
    }
    const result = await window['electronAPI'].invoke('backup:read', { path }) as BackupGatewayReadResult;
    if (!result?.ok) {
      throw new Error(result?.error ?? 'VERIFI could not read the backup file.');
    }
    return result.data;
  }

  async write(path: string, backup: BackupFile): Promise<void> {
    if (!this.isAvailable || !path) {
      throw new Error('A backup file path is required.');
    }
    const result = await window['electronAPI'].invoke('backup:write', { path, backup }) as BackupGatewayWriteResult;
    if (!result?.ok) {
      throw new Error(result?.error ?? 'VERIFI could not write the backup file.');
    }
  }
}

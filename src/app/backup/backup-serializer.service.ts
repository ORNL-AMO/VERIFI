import { Injectable } from '@angular/core';
import JSZip from 'jszip';
import { BackupFile } from '../models/backup-file';

export interface BackupSerializer {
  serialize(backup: BackupFile): string;
  createZip(backup: BackupFile, baseName?: string): Promise<Blob>;
  getBaseName(backup: BackupFile): string;
  getFileName(backup: BackupFile, extension?: 'json' | 'zip'): string;
}

@Injectable({ providedIn: 'root' })
export class JsonBackupSerializer implements BackupSerializer {
  serialize(backup: BackupFile): string {
    return JSON.stringify(backup);
  }

  async createZip(backup: BackupFile, baseName = this.getBaseName(backup)): Promise<Blob> {
    const zip = new JSZip();
    zip.file(`${baseName}.json`, this.serialize(backup));
    return zip.generateAsync({ type: 'blob' });
  }

  getBaseName(backup: BackupFile): string {
    const name = backup.backupFileType === 'Facility'
      ? backup.facility?.name ?? 'Facility'
      : backup.account?.name ?? 'Account';
    return `${name.split(' ').join('_')}_Backup_${formatDateStamp(backup.timeStamp)}`;
  }

  getFileName(backup: BackupFile, extension: 'json' | 'zip' = 'json'): string {
    return `${this.getBaseName(backup)}.${extension}`;
  }
}

function formatDateStamp(date: Date | string): string {
  const value = new Date(date);
  return `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}`;
}

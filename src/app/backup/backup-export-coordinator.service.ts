import { Injectable } from '@angular/core';
import { AccountWorkspaceLoaderService } from '../account-workspace/account-workspace-loader.service';
import { AccountWorkspaceStore } from '../account-workspace/account-workspace.store';
import { BackupFile } from '../models/backup-file';
import { BrowserBackupDownloadService } from './browser-backup-download.service';
import { JsonBackupSerializer } from './backup-serializer.service';
import { WorkspaceBackupSnapshotBuilder } from './backup-snapshot-builder.service';

@Injectable({ providedIn: 'root' })
export class BackupExportCoordinator {
  constructor(
    private readonly workspaceStore: AccountWorkspaceStore,
    private readonly loader: AccountWorkspaceLoaderService,
    private readonly builder: WorkspaceBackupSnapshotBuilder,
    private readonly serializer: JsonBackupSerializer,
    private readonly browserDownloads: BrowserBackupDownloadService
  ) { }

  async exportActiveAccount(options?: { downloadAsZip?: boolean }): Promise<BackupFile> {
    const backup = this.buildActiveAccountBackup();
    await this.deliverToBrowser(backup, options?.downloadAsZip);
    return backup;
  }

  async exportAccountByGuid(accountGuid: string, options?: { downloadAsZip?: boolean }): Promise<BackupFile> {
    const backup = await this.buildAccountBackupByGuid(accountGuid);
    await this.deliverToBrowser(backup, options?.downloadAsZip);
    return backup;
  }

  async exportFacility(facilityGuid: string): Promise<BackupFile> {
    const backup = this.buildFacilityBackup(facilityGuid);
    await this.deliverToBrowser(backup, false);
    return backup;
  }

  buildActiveAccountBackup(): BackupFile {
    const snapshot = this.workspaceStore.snapshot();
    if (!snapshot) {
      throw new Error('An account workspace must be loaded before creating a backup.');
    }
    return this.builder.buildAccountBackup(snapshot);
  }

  async buildAccountBackupByGuid(accountGuid: string): Promise<BackupFile> {
    const active = this.workspaceStore.snapshot();
    if (active?.account.guid === accountGuid) {
      return this.builder.buildAccountBackup(active);
    }
    const snapshot = await this.loader.load(accountGuid);
    return this.builder.buildAccountBackup(snapshot);
  }

  buildFacilityBackup(facilityGuid: string): BackupFile {
    const snapshot = this.workspaceStore.snapshot();
    if (!snapshot) {
      throw new Error('An account workspace must be loaded before creating a facility backup.');
    }
    return this.builder.buildFacilityBackup(snapshot, facilityGuid);
  }

  async deliverToBrowser(backup: BackupFile, downloadAsZip = false): Promise<void> {
    if (downloadAsZip) {
      const blob = await this.serializer.createZip(backup);
      this.browserDownloads.downloadBlob(blob, this.serializer.getFileName(backup, 'zip'));
      return;
    }
    this.browserDownloads.downloadText(
      this.serializer.serialize(backup),
      this.serializer.getFileName(backup)
    );
  }
}

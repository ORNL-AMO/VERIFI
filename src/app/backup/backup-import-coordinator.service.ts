import { Injectable } from '@angular/core';
import { AnalyticsService } from '../analytics/analytics.service';
import { AccountWorkspaceService } from '../account-workspace/account-workspace.service';
import { WorkspaceCommandBoundary } from '../account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from '../account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from '../account-workspace/handlers/facility-command-handler.service';
import { ApplicationLifecycleService } from '../application-lifecycle/application-lifecycle.service';
import { DeleteDataService } from '../indexedDB/delete-data.service';
import { FACILITY_DELETION_MESSAGES } from '../indexedDB/facility-deletion.config';
import { IdbAccount } from '../models/idbModels/account';
import { IdbFacility } from '../models/idbModels/facility';
import { LoadingService } from '../core-components/loading/loading.service';
import { BackupPreparationService, PreparedBackupFile } from './backup-preparation.service';
import { BackupComparisonService, FacilityBackupDifference } from './backup-comparison.service';
import { BackupDataService } from './backup-data.service';

export interface PreparedBackupSelection {
  readonly selectedFacility: IdbFacility;
  readonly backup: PreparedBackupFile;
}

@Injectable({ providedIn: 'root' })
export class BackupImportCoordinator {
  constructor(
    private readonly backupPreparation: BackupPreparationService,
    private readonly backupComparison: BackupComparisonService,
    private readonly backupData: BackupDataService,
    private readonly loadingService: LoadingService,
    private readonly commandBoundary: WorkspaceCommandBoundary,
    private readonly accountHandler: AccountCommandHandler,
    private readonly facilityHandler: FacilityCommandHandler,
    private readonly applicationLifecycle: ApplicationLifecycleService,
    private readonly workspaceService: AccountWorkspaceService,
    private readonly deleteDataService: DeleteDataService,
    private readonly analytics: AnalyticsService
  ) { }

  prepareParsedBackup(input: unknown): PreparedBackupFile {
    return this.backupPreparation.prepare(input);
  }

  prepareTextBackup(text: string): PreparedBackupFile {
    return this.prepareParsedBackup(JSON.parse(text));
  }

  extractFacility(backup: PreparedBackupFile, facilityGuid: string): PreparedBackupFile {
    return this.backupPreparation.extractFacility(backup, facilityGuid);
  }

  comparePreparedAccountBackup(backup: PreparedBackupFile): Array<FacilityBackupDifference> {
    return this.backupComparison.comparePreparedAccountBackup(backup);
  }

  async importNewAccount(backup: PreparedBackupFile): Promise<IdbAccount> {
    this.analytics.sendEvent('import_backup_file');
    this.deleteDataService.suspendQueuedDeletion();
    try {
      const newAccount = await this.backupData.importAccountBackupFile(backup, 0);
      await this.accountHandler.update(newAccount, newAccount.guid);
      await this.applicationLifecycle.activatePersistedAccount(newAccount.guid);
      return newAccount;
    } finally {
      await this.deleteDataService.resumeQueuedDeletion();
    }
  }

  async replaceActiveAccount(backup: PreparedBackupFile): Promise<IdbAccount> {
    this.analytics.sendEvent('import_backup_file');
    this.deleteDataService.suspendQueuedDeletion();
    try {
      return await this.applicationLifecycle.replaceActiveAccount(
        () => this.backupData.importAccountBackupFile(backup, 0)
      );
    } finally {
      await this.deleteDataService.resumeQueuedDeletion();
    }
  }

  async importNewFacility(backup: PreparedBackupFile, selectedAccountGuid: string, currIdx = 0): Promise<IdbFacility> {
    this.analytics.sendEvent('import_backup_file');
    const result = await this.commandBoundary.execute(
      { entityKind: 'facility', changeKind: 'add', label: 'Importing facility' },
      async () => {
        const { facility } = await this.backupData.importFacilityBackupFile(backup, selectedAccountGuid, currIdx);
        return facility;
      }
    );
    this.workspaceService.selectFacility(result.value.guid);
    return result.value;
  }

  async replaceFacility(
    backup: PreparedBackupFile,
    selectedAccount: IdbAccount,
    facilityToReplace: IdbFacility
  ): Promise<void> {
    this.analytics.sendEvent('import_backup_file');
    await this.commandBoundary.execute(
      { entityKind: 'facility', changeKind: 'bulk', label: 'Replacing facility' },
      async () => {
        FACILITY_DELETION_MESSAGES.forEach(message => this.loadingService.addLoadingMessage(message));
        this.loadingService.setContext('import-facility-backup');
        this.loadingService.setTitle('Replacing facility');
        let currIdx = 0;
        await this.facilityHandler.delete(facilityToReplace, selectedAccount.guid, phase => {
          currIdx = phase.index;
        });
        await this.backupData.importFacilityBackupFile(backup, selectedAccount.guid, currIdx);
      }
    );
  }

  async importSelectedFacilities(
    selectedAccount: IdbAccount,
    preparedFacilities: Array<PreparedBackupSelection>,
    facilityImportSelections: Record<string, { importAs: 'new' | 'replace'; replacedFacility?: string }>,
    accountFacilities: Array<IdbFacility>
  ): Promise<void> {
    this.analytics.sendEvent('import_backup_file');
    await this.commandBoundary.execute(
      { entityKind: 'facility', changeKind: 'bulk', label: 'Importing facilities' },
      async () => {
        for (const { selectedFacility } of preparedFacilities) {
          const selection = facilityImportSelections[selectedFacility.name];
          if (selection.importAs === 'replace' && selection.replacedFacility) {
            const facilityToReplace = accountFacilities.find(item => item.name === selection.replacedFacility);
            if (facilityToReplace) {
              await this.facilityHandler.delete(facilityToReplace, selectedAccount.guid);
            }
          }
        }

        let idx = 1;
        for (const { backup } of preparedFacilities) {
          this.loadingService.setCurrentLoadingIndex(idx);
          const { index = idx } = await this.backupData.importFacilityBackupFile(backup, selectedAccount.guid, idx);
          idx = index + 1;
        }
      }
    );
  }
}

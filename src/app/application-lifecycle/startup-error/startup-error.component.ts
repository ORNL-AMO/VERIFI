import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AppStartupError } from '../application-lifecycle.models';
import { DatabaseResetService } from '../database-reset.service';
import { MigrationRecoveryService } from '../recovery/migration-recovery.service';

type RecoveryUiStatus =
  | 'idle'
  | 'exporting'
  | 'exported'
  | 'cancelled'
  | 'failed'
  | 'resetting'
  | 'reset-failed';

@Component({
  selector: 'app-startup-error',
  templateUrl: './startup-error.component.html',
  styleUrls: ['./startup-error.component.css'],
  standalone: false
})
export class StartupErrorComponent {
  @Input({ required: true }) error!: AppStartupError;
  @Output() retryRequested = new EventEmitter<void>();

  recoveryStatus: RecoveryUiStatus = 'idle';
  recoveryMessage = '';
  showResetConfirmation = false;

  constructor(
    private migrationRecovery: MigrationRecoveryService,
    private databaseReset: DatabaseResetService
  ) { }

  get recoveryBusy(): boolean {
    return this.recoveryStatus === 'exporting'
      || this.recoveryStatus === 'resetting';
  }

  get recoveryExported(): boolean {
    return this.recoveryStatus === 'exported' || this.recoveryStatus === 'reset-failed';
  }

  retryStartup(): void {
    if (this.recoveryBusy) { return; }
    this.clearRecoveryState();
    this.retryRequested.emit();
  }

  async exportRecoverySnapshot(): Promise<void> {
    if (this.error.step !== 'migrations' || this.recoveryBusy) { return; }
    this.clearRecoveryState();
    this.recoveryStatus = 'exporting';
    this.recoveryMessage = 'Preparing the recovery snapshot...';
    try {
      const result = await this.migrationRecovery.exportSnapshot(this.error);
      if (result.status === 'cancelled') {
        this.recoveryStatus = 'cancelled';
        this.recoveryMessage = 'Recovery export was cancelled. No data was changed.';
        return;
      }
      this.recoveryStatus = 'exported';
      this.recoveryMessage = result.filePath
        ? `Recovery snapshot saved at ${result.filePath}. Keep it in a safe location before resetting.`
        : 'Recovery snapshot downloaded. Keep it in a safe location before resetting.';
    } catch (error) {
      this.recoveryStatus = 'failed';
      this.recoveryMessage = recoveryErrorMessage(error, 'VERIFI could not create the recovery snapshot.');
    }
  }

  requestDatabaseReset(): void {
    if (!this.recoveryExported || this.recoveryBusy) { return; }
    this.showResetConfirmation = true;
  }

  cancelDatabaseReset(): void {
    this.showResetConfirmation = false;
  }

  async confirmDatabaseReset(): Promise<void> {
    if (!this.recoveryExported || this.recoveryBusy || !this.showResetConfirmation) { return; }
    this.showResetConfirmation = false;
    this.recoveryStatus = 'resetting';
    this.recoveryMessage = 'Resetting the local database and restarting VERIFI...';
    try {
      const success = await this.databaseReset.resetAndRestart();
      if (success) { return; }
    } catch {
      // Surface reset failures in the recovery panel while preserving the exported state.
    }
    if (this.recoveryStatus === 'resetting') {
      this.recoveryStatus = 'reset-failed';
      this.recoveryMessage = 'VERIFI could not complete the reset and restart process. Keep the recovery snapshot in a safe location, then restart or reload VERIFI. Contact the VERIFI help desk if the problem continues.';
    }
  }

  private clearRecoveryState(): void {
    this.recoveryStatus = 'idle';
    this.recoveryMessage = '';
    this.showResetConfirmation = false;
  }
}

function recoveryErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

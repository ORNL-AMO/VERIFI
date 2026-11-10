import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AutomaticBackupsService } from './automatic-backups.service';
import { ElectronService } from './electron.service';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';

@Injectable({ providedIn: 'root' })
export class UpdateInstallService {
  private pending?: Promise<boolean>;

  constructor(
    private readonly router: Router,
    private readonly commands: WorkspaceCommandBoundary,
    private readonly backups: AutomaticBackupsService,
    private readonly electron: ElectronService,
    private readonly loading: LoadingService,
    private readonly lifecycle: ApplicationLifecycleService
  ) { }

  install(): Promise<boolean> {
    if (!this.pending) {
      this.pending = this.prepare().finally(() => { this.pending = undefined; });
    }
    return this.pending;
  }

  private async prepare(): Promise<boolean> {
    if (!this.electron.isElectron || this.electron.updateState.value.status !== 'downloaded') return false;
    const startup = await this.lifecycle.initialize();
    if (startup.status !== 'ready' && startup.status !== 'empty') {
      throw new Error('Resolve the application startup issue before restarting to install the update.');
    }
    // Real navigation runs the existing editor leave guards, including Save/Discard/Cancel.
    if (this.router.url !== '/welcome' && !await this.router.navigateByUrl('/welcome')) return false;
    this.loading.setLoadingMessage('Finishing saves and backups before restarting…');
    this.loading.setLoadingStatus(true);
    try {
      do {
        await this.commands.whenIdle();
        await this.backups.flushPending();
      } while (this.commands.hasPendingCommands || this.commands.hasUnresolvedFailures || this.backups.hasPendingOperations);
      if (this.electron.updateState.value.status !== 'downloaded') return false;
      this.electron.installUpdate();
      return true;
    } finally {
      this.loading.setLoadingStatus(false);
      this.loading.setLoadingMessage(undefined);
    }
  }
}
